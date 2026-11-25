import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { RentDue } from './rent-due.entity';
import {
  addDays,
  classifyUnpaid,
  currentCycleNo,
  cycleEnd,
  cycleStart,
  diffDays,
  durationMonths,
  todayIST,
} from './rent-dues.helpers';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Booking } from '../bookings/booking.entity';
import { Payment } from '../payments/payment.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { WardenNotification } from '../warden-notifications/warden-notification.entity';
import { AuditLog } from '../warden-actions/audit-log.entity';

const GENERATE_DAYS_BEFORE = 7; // next cycle's due row is created 7 days before its dueDate
const MAX_CATCH_UP_CYCLES = 6;

export interface Actor {
  id?: number;
  role?: string;
}

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

@Injectable()
export class RentDuesService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RentDuesService.name);
  private timer?: NodeJS.Timeout;
  private running: Promise<any> | null = null;
  private lastRunAt = 0;

  constructor(private readonly dataSource: DataSource) {}

  /* ------------------------------------------------------------------ *
   * Scheduler: no extra dependency. Runs once at start-up (so a server that was
   * switched off catches up immediately), then hourly. Hourly is enough because
   * every action is keyed on whole days and is idempotent.
   * ------------------------------------------------------------------ */
  onApplicationBootstrap() {
    setTimeout(() => this.runDailyCheck().catch((e) => this.logger.error(e?.message || e)), 5_000).unref?.();
    this.timer = setInterval(
      () => this.runDailyCheck().catch((e) => this.logger.error(e?.message || e)),
      60 * 60 * 1000,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Cheap freshness guard so dashboards are correct even if the hourly tick has not fired yet. */
  private async syncIfStale() {
    if (Date.now() - this.lastRunAt > 60_000) await this.runDailyCheck().catch(() => undefined);
  }

  /* ------------------------------------------------------------------ *
   * The daily job. `today` can be overridden (admin demo endpoint).
   * 1. 7 days before dueDate  -> next cycle row is created as 'upcoming'
   * 2. 3 days before dueDate  -> 'due_soon' + reminder to tenant
   * 3. 1 day past dueDate     -> 'overdue' + alert to warden (and tenant)
   * ------------------------------------------------------------------ */
  async runDailyCheck(todayOverride?: string) {
    if (this.running && !todayOverride) return this.running;
    const today = todayOverride || todayIST();
    const job = this.dataSource
      .transaction(async (manager) => {
        const summary = { today, generated: 0, reminders: 0, overdue: 0 };
        await this.generateDues(manager, today, summary);
        await this.advanceStatuses(manager, today, summary);
        return summary;
      })
      .finally(() => {
        this.running = null;
        this.lastRunAt = Date.now();
      });
    if (!todayOverride) this.running = job;
    const result = await job;
    if (result.generated || result.reminders || result.overdue) this.logger.log(`Rent dues check ${JSON.stringify(result)}`);
    return result;
  }

  private async generateDues(manager: EntityManager, today: string, summary: { generated: number }) {
    const stays = await manager.getRepository(TenantStay).find({ where: { status: 'active' } });
    const dueRepo = manager.getRepository(RentDue);

    for (const stay of stays) {
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .where('b."tenantId" = :t AND b."propertyId" = :p AND b.status IN (:...s)', {
          t: stay.tenantId,
          p: stay.propertyId,
          s: ['confirmed', 'active'],
        })
        .orderBy('b.id', 'DESC')
        .getOne();
      const rent = Number(booking?.rent || 0);
      if (!booking || !rent) continue;
      const anchor = String(booking.checkIn || stay.moveInDate).slice(0, 10);
      const maxCycles = durationMonths(booking.duration);

      let dues = await dueRepo.find({ where: { tenantId: stay.tenantId, propertyId: stay.propertyId }, order: { cycleNo: 'ASC' } });

      // Tenants that pre-date the ledger: seed ONE cycle (the current one) instead of years of fake arrears.
      if (dues.length === 0) {
        const cycleNo = currentCycleNo(anchor, today);
        const hasVerified = await manager.getRepository(Payment).findOne({
          where: { tenantId: stay.tenantId, status: 'verified' },
          order: { id: 'DESC' },
        });
        const seeded = await dueRepo.save(
          dueRepo.create({
            tenantId: stay.tenantId,
            stayId: stay.id,
            bookingId: booking.id,
            propertyId: stay.propertyId,
            roomId: stay.roomId ?? null,
            cycleNo,
            periodStart: cycleStart(anchor, cycleNo),
            periodEnd: cycleEnd(anchor, cycleNo),
            amount: rent,
            dueDate: cycleStart(anchor, cycleNo),
            status: hasVerified ? 'paid' : 'upcoming',
            paymentId: hasVerified?.id ?? null,
            paidAt: hasVerified ? new Date() : null,
            paidVia: hasVerified ? 'legacy' : null,
          }),
        );
        dues = [seeded];
        summary.generated++;
      }

      let latest = dues[dues.length - 1];
      for (let i = 0; i < MAX_CATCH_UP_CYCLES; i++) {
        const nextNo = latest.cycleNo + 1;
        if (maxCycles && nextNo > maxCycles) break; // tenancy term finished
        const nextStart = cycleStart(anchor, nextNo);
        if (diffDays(nextStart, today) > GENERATE_DAYS_BEFORE) break;
        const created = await dueRepo.save(
          dueRepo.create({
            tenantId: stay.tenantId,
            stayId: stay.id,
            bookingId: booking.id,
            propertyId: stay.propertyId,
            roomId: stay.roomId ?? null,
            cycleNo: nextNo,
            periodStart: nextStart,
            periodEnd: cycleEnd(anchor, nextNo),
            amount: rent,
            dueDate: nextStart,
            status: 'upcoming',
          }),
        ).catch(() => null); // unique (tenantId, periodStart) protects against concurrent runs
        if (!created) break;
        summary.generated++;
        latest = created;
      }
    }
  }

  private async advanceStatuses(manager: EntityManager, today: string, summary: { reminders: number; overdue: number }) {
    const dueRepo = manager.getRepository(RentDue);
    const unpaid = await dueRepo.find({ where: { status: In(['upcoming', 'due_soon', 'overdue']) } });

    for (const due of unpaid) {
      const next = classifyUnpaid(due.dueDate, today);
      let changed = false;

      if (next !== due.status) {
        due.status = next;
        changed = true;
      }

      if ((next === 'due_soon' || next === 'overdue') && !due.reminderSentAt) {
        const days = diffDays(due.dueDate, today);
        await this.notifyTenant(manager, due, {
          title: next === 'overdue' ? 'Rent overdue' : 'Rent due soon',
          message:
            next === 'overdue'
              ? `Your rent of ${inr(due.amount)} was due on ${fmtDate(due.dueDate)} and is still unpaid. Please pay now from Payments.`
              : `Your rent of ${inr(due.amount)} is due on ${fmtDate(due.dueDate)} (${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}). Pay from Payments to avoid it going overdue.`,
          type: 'payment_reminder',
          priority: next === 'overdue' ? 'high' : 'normal',
        });
        due.reminderSentAt = new Date();
        summary.reminders++;
        changed = true;
      }

      if (next === 'overdue' && !due.overdueAlertedAt) {
        await this.alertWardenOverdue(manager, due, today);
        due.overdueAlertedAt = new Date();
        summary.overdue++;
        changed = true;
      }

      if (changed) await dueRepo.save(due);
    }
  }

  private async notifyTenant(
    manager: EntityManager,
    due: Pick<RentDue, 'tenantId' | 'propertyId'>,
    n: { title: string; message: string; type: string; priority: string; byUserId?: number },
  ) {
    await manager.getRepository(Notification).save({
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      recipients: 1,
      sentAt: new Date().toISOString().split('T')[0],
      userId: due.tenantId,
      targetPropertyId: due.propertyId,
      byUserId: n.byUserId,
      read: false,
      isRead: false,
    } as any);
  }

  private async alertWardenOverdue(manager: EntityManager, due: RentDue, today: string) {
    const [tenant, property, stay] = await Promise.all([
      manager.getRepository(User).findOneBy({ id: due.tenantId }),
      manager.getRepository(Property).findOneBy({ id: due.propertyId }),
      manager.getRepository(TenantStay).findOne({ where: { tenantId: due.tenantId, status: 'active' }, relations: { roomEntity: true } }),
    ]);
    const days = Math.max(1, diffDays(today, due.dueDate));
    await manager.getRepository(WardenNotification).save({
      title: 'Rent not paid',
      message: `${tenant?.name || 'A tenant'} has not paid ${inr(due.amount)} due on ${fmtDate(due.dueDate)} (${days} day${days === 1 ? '' : 's'} overdue).`,
      type: 'payment_overdue',
      priority: 'high',
      read: false,
      senderName: 'RentBro System',
      senderRole: 'system',
      propertyName: property?.name,
      roomNumber: stay?.roomEntity?.roomNumber,
      tenantId: due.tenantId,
      propertyId: due.propertyId,
      sourceReferenceId: due.id,
    });
  }

  /* ------------------------------ queries ------------------------------ */

  /** Adds `effectiveStatus` + countdown so the UI is right even between job runs. */
  private decorate(due: RentDue, today = todayIST()) {
    const unpaid = ['upcoming', 'due_soon', 'overdue'].includes(due.status);
    const effectiveStatus = unpaid ? classifyUnpaid(due.dueDate, today) : due.status;
    return {
      ...due,
      amount: Number(due.amount),
      effectiveStatus,
      daysUntilDue: diffDays(due.dueDate, today), // negative = days overdue
    };
  }

  async findMine(tenantId: number) {
    await this.syncIfStale();
    const dues = await this.dataSource.getRepository(RentDue).find({ where: { tenantId }, order: { cycleNo: 'ASC' } });
    const payments = dues.length
      ? await this.dataSource.getRepository(Payment).findBy({ id: In(dues.map((d) => d.paymentId).filter(Boolean) as number[]) })
      : [];
    return dues.map((d) => ({ ...this.decorate(d), payment: payments.find((p) => p.id === d.paymentId) || null }));
  }

  /** Warden/owner/admin view of one tenant's whole ledger. */
  async findForTenant(tenantId: number) {
    return this.findMine(tenantId);
  }

  /** Warden month view: one row per active tenant for the chosen billing month ('YYYY-MM'). */
  async ledger(month: string, propertyId?: number) {
    if (!/^\d{4}-\d{2}$/.test(month || '')) throw new BadRequestException('month must look like 2026-12');
    await this.syncIfStale();
    const today = todayIST();
    const stays = await this.dataSource.getRepository(TenantStay).find({
      where: propertyId ? { status: 'active', propertyId } : { status: 'active' },
      relations: { tenant: true, roomEntity: true },
    });
    const dueRepo = this.dataSource.getRepository(RentDue);
    const rows: any[] = [];

    for (const stay of stays) {
      const booking = await this.dataSource
        .getRepository(Booking)
        .createQueryBuilder('b')
        .where('b."tenantId" = :t AND b.status IN (:...s)', { t: stay.tenantId, s: ['confirmed', 'active'] })
        .orderBy('b.id', 'DESC')
        .getOne();
      const dues = await dueRepo.find({ where: { tenantId: stay.tenantId }, order: { cycleNo: 'ASC' } });
      const due = dues.find((d) => d.dueDate.startsWith(month));
      const anchor = String(booking?.checkIn || stay.moveInDate).slice(0, 10);

      let entry: any = null;
      if (due) {
        entry = this.decorate(due, today);
      } else if (booking) {
        // Month not generated yet: project it so the warden still sees what is coming.
        const monthStart = `${month}-01`;
        const maxCycles = durationMonths(booking.duration);
        for (let n = 1; n <= (maxCycles || 120); n++) {
          const s = cycleStart(anchor, n);
          if (s.startsWith(month)) {
            entry = {
              id: null,
              tenantId: stay.tenantId,
              cycleNo: n,
              periodStart: s,
              periodEnd: cycleEnd(anchor, n),
              dueDate: s,
              amount: Number(booking.rent || 0),
              status: 'not_billed',
              effectiveStatus: 'not_billed',
              daysUntilDue: diffDays(s, today),
            };
            break;
          }
          if (s > addDays(monthStart, 40)) break;
        }
      }

      rows.push({
        tenantId: stay.tenantId,
        stayId: stay.id,
        name: stay.tenant?.name,
        phone: stay.tenant?.phone,
        email: stay.tenant?.email,
        propertyId: stay.propertyId,
        room: stay.roomEntity?.roomNumber || booking?.room,
        bedNumber: stay.bedNumber || booking?.bedNumber || null,
        checkIn: anchor,
        monthlyRent: Number(booking?.rent || 0),
        due: entry,
        status: entry?.effectiveStatus || 'no_cycle',
      });
    }

    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      month,
      today,
      summary: {
        total: rows.length,
        paid: count('paid') + count('waived'),
        dueSoon: count('due_soon'),
        overdue: count('overdue'),
        upcoming: count('upcoming') + count('not_billed'),
      },
      rows,
    };
  }

  /* ------------------------------ actions ------------------------------ */

  private async loadDueForUpdate(manager: EntityManager, id: number) {
    const due = await manager.getRepository(RentDue).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!due) throw new NotFoundException(`Rent due ${id} not found`);
    if (due.status === 'paid' || due.status === 'waived') throw new BadRequestException(`This rent is already ${due.status}`);
    return due;
  }

  private async recordRentPayment(
    manager: EntityManager,
    due: RentDue,
    args: { method: string; transactionId?: string; status?: string; clearance?: string },
  ) {
    const property = await manager.getRepository(Property).findOneBy({ id: due.propertyId });
    const amount = Number(due.amount);
    const platformFee = property?.commissionRate ? (amount * Number(property.commissionRate)) / 100 : 0;
    const stay = await manager.getRepository(TenantStay).findOne({ where: { tenantId: due.tenantId, status: 'active' }, relations: { roomEntity: true } });
    const paymentRepo = manager.getRepository(Payment);
    return paymentRepo.save(
      paymentRepo.create({
        tenantId: due.tenantId,
        propertyId: due.propertyId,
        roomId: due.roomId ?? undefined,
        room: stay?.roomEntity?.roomNumber || '—',
        amount,
        method: args.method,
        transactionId: args.transactionId || `TXN-${Date.now()}`,
        paidDate: todayIST(),
        status: args.status || 'verified',
        clearance: args.clearance || 'Cleared',
        platformFee,
        rentAmount: amount,
        depositAmount: 0,
        feeAmount: 0,
        kind: 'rent',
        bedNumber: stay?.bedNumber ?? undefined,
      } as any),
    ) as unknown as Payment;
  }

  /** Tenant pays their own due. Amount ALWAYS comes from the ledger row, never from the client. */
  async pay(dueId: number, actor: Actor, body: { method?: string; transactionId?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const due = await this.loadDueForUpdate(manager, dueId);
      if (actor.role === 'tenant' && Number(actor.id) !== due.tenantId) throw new ForbiddenException('This rent belongs to another tenant');
      const payment = await this.recordRentPayment(manager, due, {
        method: (body.method || 'UPI').toUpperCase(),
        transactionId: body.transactionId,
      });
      due.status = 'paid';
      due.paymentId = payment.id;
      due.paidAt = new Date();
      due.paidVia = 'online';
      await manager.getRepository(RentDue).save(due);
      await this.notifyTenant(manager, due, {
        title: 'Rent payment received',
        message: `We received ${inr(due.amount)} for ${fmtDate(due.periodStart)} – ${fmtDate(due.periodEnd)}. Transaction ${payment.transactionId}.`,
        type: 'payment_receipt',
        priority: 'normal',
      });
      return { due: this.decorate(due), payment };
    });
  }

  /** Warden records cash / offline payment. */
  async markPaidOffline(dueId: number, actor: Actor, note?: string) {
    return this.dataSource.transaction(async (manager) => {
      const due = await this.loadDueForUpdate(manager, dueId);
      const warden = actor.id ? await manager.getRepository(User).findOneBy({ id: actor.id }) : null;
      const tenant = await manager.getRepository(User).findOneBy({ id: due.tenantId });
      const payment = await this.recordRentPayment(manager, due, { method: 'CASH', transactionId: `CASH-${Date.now()}` });
      due.status = 'paid';
      due.paymentId = payment.id;
      due.paidAt = new Date();
      due.paidVia = 'cash';
      await manager.getRepository(RentDue).save(due);
      await this.notifyTenant(manager, due, {
        title: 'Cash rent payment recorded',
        message: `Your warden recorded a cash payment of ${inr(due.amount)} for ${fmtDate(due.periodStart)} – ${fmtDate(due.periodEnd)}.`,
        type: 'payment_receipt',
        priority: 'normal',
        byUserId: actor.id,
      });
      await manager.getRepository(AuditLog).save({
        action: 'RENT_MARKED_PAID_OFFLINE',
        actorId: actor.id ?? null,
        actorRole: actor.role ?? null,
        actorName: warden?.name ?? null,
        tenantId: due.tenantId,
        tenantName: tenant?.name ?? null,
        propertyId: due.propertyId,
        reason: note || null,
        details: { dueId: due.id, amount: Number(due.amount), period: [due.periodStart, due.periodEnd] },
      });
      return { due: this.decorate(due), payment };
    });
  }

  async waive(dueId: number, actor: Actor, reason: string) {
    if (!reason || !reason.trim()) throw new BadRequestException('A reason is required to waive rent');
    return this.dataSource.transaction(async (manager) => {
      const due = await this.loadDueForUpdate(manager, dueId);
      const warden = actor.id ? await manager.getRepository(User).findOneBy({ id: actor.id }) : null;
      const tenant = await manager.getRepository(User).findOneBy({ id: due.tenantId });
      due.status = 'waived';
      due.waivedReason = reason.trim();
      due.paidAt = new Date();
      due.paidVia = 'waived';
      await manager.getRepository(RentDue).save(due);
      await this.notifyTenant(manager, due, {
        title: 'Rent waived',
        message: `Your rent of ${inr(due.amount)} for ${fmtDate(due.periodStart)} – ${fmtDate(due.periodEnd)} has been waived. Reason: ${reason.trim()}`,
        type: 'payment_receipt',
        priority: 'normal',
        byUserId: actor.id,
      });
      await manager.getRepository(AuditLog).save({
        action: 'RENT_WAIVED',
        actorId: actor.id ?? null,
        actorRole: actor.role ?? null,
        actorName: warden?.name ?? null,
        tenantId: due.tenantId,
        tenantName: tenant?.name ?? null,
        propertyId: due.propertyId,
        reason: reason.trim(),
        details: { dueId: due.id, amount: Number(due.amount), period: [due.periodStart, due.periodEnd] },
      });
      return { due: this.decorate(due) };
    });
  }
}
