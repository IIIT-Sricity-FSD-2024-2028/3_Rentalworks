import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
import { Room } from '../rooms/room.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Property } from '../properties/property.entity';
import { Notification } from '../notifications/notification.entity';
import { RentDue } from '../rent-dues/rent-due.entity';
import { AuditLog } from './audit-log.entity';
import { diffDays, todayIST } from '../rent-dues/rent-dues.helpers';

export interface Actor {
  id?: number;
  role?: string;
}

const today = () => new Date().toISOString().split('T')[0];

@Injectable()
export class WardenActionsService {
  constructor(private readonly dataSource: DataSource) {}

  private async actorName(actor: Actor) {
    if (!actor.id) return null;
    const u = await this.dataSource.getRepository(User).findOneBy({ id: actor.id });
    return u?.name ?? null;
  }

  private async tenantContext(tenantId: number) {
    const tenant = await this.dataSource.getRepository(User).findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    const stay = await this.dataSource.getRepository(TenantStay).findOne({
      where: { tenantId, status: 'active' },
      relations: { roomEntity: true, property: true },
      order: { id: 'DESC' },
    });
    return { tenant, stay };
  }

  /** Warden -> tenant message (rent reminder, rule notice, custom). */
  async notifyTenant(
    tenantId: number,
    actor: Actor,
    body: { title?: string; message: string; kind?: string; dueId?: number; priority?: string },
  ) {
    const message = (body.message || '').trim();
    if (!message) throw new BadRequestException('Message is required');
    const { tenant, stay } = await this.tenantContext(tenantId);
    const kind = body.kind || 'custom';
    const title =
      body.title?.trim() ||
      (kind === 'rent_reminder' ? 'Rent reminder from your warden' : kind === 'rule_notice' ? 'Hostel rule notice' : 'Message from your warden');

    return this.dataSource.transaction(async (manager) => {
      const notification = await manager.getRepository(Notification).save({
        title,
        message,
        type: kind === 'rent_reminder' ? 'payment_reminder' : kind === 'rule_notice' ? 'rule_notice' : 'warden_notice',
        priority: body.priority || (kind === 'custom' ? 'normal' : 'high'),
        recipients: 1,
        sentAt: today(),
        userId: tenantId,
        byUserId: actor.id,
        targetPropertyId: stay?.propertyId,
        read: false,
        isRead: false,
      } as any);

      if (body.dueId) {
        await manager.getRepository(RentDue).update({ id: body.dueId, tenantId }, { wardenReminderAt: new Date() });
      }
      await manager.getRepository(AuditLog).save({
        action: 'TENANT_NOTIFIED',
        actorId: actor.id ?? null,
        actorRole: actor.role ?? null,
        actorName: await this.actorName(actor),
        tenantId,
        tenantName: tenant.name,
        propertyId: stay?.propertyId ?? null,
        roomNumber: stay?.roomEntity?.roomNumber ?? null,
        bedNumber: stay?.bedNumber ?? null,
        details: { kind, title, dueId: body.dueId ?? null, notificationId: (notification as any).id },
      });
      return { success: true, notification };
    });
  }

  /** Warden -> property owner escalation (unpaid dues / violations). */
  async escalateToOwner(
    tenantId: number,
    actor: Actor,
    body: { message: string; reason?: string; category?: string },
  ) {
    const message = (body.message || '').trim();
    if (!message) throw new BadRequestException('Message is required');
    const { tenant, stay } = await this.tenantContext(tenantId);
    if (!stay) throw new BadRequestException('This tenant has no active stay to escalate');
    const property = await this.dataSource.getRepository(Property).findOneBy({ id: stay.propertyId });
    if (!property?.ownerId) throw new BadRequestException('This property has no owner account to notify');

    // Attach the facts the owner needs: unpaid amount, how late.
    const dues = await this.dataSource
      .getRepository(RentDue)
      .find({ where: { tenantId, status: In(['upcoming', 'due_soon', 'overdue']) }, order: { dueDate: 'ASC' } });
    const overdue = dues.filter((d) => diffDays(todayIST(), d.dueDate) > 0);
    const overdueTotal = overdue.reduce((s, d) => s + Number(d.amount), 0);

    return this.dataSource.transaction(async (manager) => {
      const lines = [
        message,
        '',
        `Tenant: ${tenant.name} • Room ${stay.roomEntity?.roomNumber || '—'}${stay.bedNumber ? ` / Bed ${stay.bedNumber}` : ''} • ${property.name}`,
      ];
      if (overdue.length) lines.push(`Overdue rent: ₹${overdueTotal.toLocaleString('en-IN')} across ${overdue.length} month(s)`);

      const notification = await manager.getRepository(Notification).save({
        title: body.category === 'violation' ? `Escalation: rule violation – ${tenant.name}` : `Escalation: unpaid rent – ${tenant.name}`,
        message: lines.join('\n'),
        type: 'escalation',
        priority: 'high',
        recipients: 1,
        sentAt: today(),
        userId: property.ownerId,
        byUserId: actor.id,
        targetPropertyId: property.id,
        read: false,
        isRead: false,
      } as any);

      await manager.getRepository(AuditLog).save({
        action: 'OWNER_ESCALATION',
        actorId: actor.id ?? null,
        actorRole: actor.role ?? null,
        actorName: await this.actorName(actor),
        tenantId,
        tenantName: tenant.name,
        propertyId: property.id,
        roomNumber: stay.roomEntity?.roomNumber ?? null,
        bedNumber: stay.bedNumber ?? null,
        reason: body.reason || message,
        details: { category: body.category || 'unpaid_rent', overdueTotal, notificationId: (notification as any).id },
      });
      return { success: true, notification };
    });
  }

  /** Remove a tenant: frees the bed, closes the stay + booking, blocks login, logs the action. */
  async evictTenant(tenantId: number, actor: Actor, reason: string) {
    const trimmed = (reason || '').trim();
    if (trimmed.length < 5) throw new BadRequestException('A reason (at least 5 characters) is required to remove a tenant');

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({ where: { id: tenantId } });
      if (!user) throw new NotFoundException(`Tenant ${tenantId} not found`);
      if (user.role !== 'tenant') throw new BadRequestException('Only tenant accounts can be removed');

      const stays = await manager.getRepository(TenantStay).find({
        where: { tenantId, status: 'active' },
        relations: { roomEntity: true },
      });
      if (stays.length === 0) throw new BadRequestException('This tenant has no active stay (already removed?)');

      const now = new Date();
      const released: { roomNumber?: string; bedNumber?: string | null; propertyId: number }[] = [];

      for (const stay of stays) {
        if (stay.roomId) {
          const room = await manager.getRepository(Room).findOne({ where: { id: stay.roomId }, lock: { mode: 'pessimistic_write' } });
          if (room) {
            room.currentOccupancy = Math.max(0, (room.currentOccupancy || 0) - 1);
            if (room.currentOccupancy < room.capacity) room.status = 'available';
            await manager.getRepository(Room).save(room);
          }
        }
        released.push({ roomNumber: stay.roomEntity?.roomNumber, bedNumber: stay.bedNumber, propertyId: stay.propertyId });
        stay.status = 'evicted';
        stay.endedAt = now;
        stay.endReason = trimmed;
        stay.moveOutDate = todayIST();
        await manager.getRepository(TenantStay).save(stay);
      }

      await manager
        .getRepository(Booking)
        .update({ tenantId, status: In(['confirmed', 'active']) }, { status: 'evicted', checkOut: todayIST() });

      user.status = 'evicted'; // login only allows status 'active'
      await manager.getRepository(User).save(user);

      // Rent not yet due is cancelled; rent already overdue stays on the books as arrears.
      const futureDues = await manager.getRepository(RentDue).find({ where: { tenantId, status: In(['upcoming', 'due_soon']) } });
      for (const d of futureDues) {
        d.status = 'waived';
        d.waivedReason = 'Tenancy ended (tenant removed)';
        d.paidVia = 'waived';
        await manager.getRepository(RentDue).save(d);
      }
      const arrears = await manager.getRepository(RentDue).find({ where: { tenantId, status: 'overdue' } });
      const arrearsTotal = arrears.reduce((s, d) => s + Number(d.amount), 0);

      const first = released[0];
      const property = await manager.getRepository(Property).findOneBy({ id: first.propertyId });
      const actorUser = actor.id ? await manager.getRepository(User).findOneBy({ id: actor.id }) : null;

      const log = await manager.getRepository(AuditLog).save({
        action: 'TENANT_EVICTED',
        actorId: actor.id ?? null,
        actorRole: actor.role ?? null,
        actorName: actorUser?.name ?? null,
        tenantId,
        tenantName: user.name,
        propertyId: first.propertyId,
        roomNumber: first.roomNumber ?? null,
        bedNumber: first.bedNumber ?? null,
        reason: trimmed,
        details: { arrearsTotal, arrearsMonths: arrears.length, released },
      });

      if (property?.ownerId) {
        await manager.getRepository(Notification).save({
          title: `Tenant removed: ${user.name}`,
          message: `${actorUser?.name || 'The warden'} removed ${user.name} from Room ${first.roomNumber || '—'}${first.bedNumber ? ` / Bed ${first.bedNumber}` : ''}.\nReason: ${trimmed}${arrearsTotal ? `\nOutstanding rent: ₹${arrearsTotal.toLocaleString('en-IN')}` : ''}`,
          type: 'eviction',
          priority: 'high',
          recipients: 1,
          sentAt: today(),
          userId: property.ownerId,
          byUserId: actor.id,
          targetPropertyId: property.id,
          read: false,
          isRead: false,
        } as any);
      }

      return { success: true, tenantId, status: 'evicted', released, arrearsTotal, auditId: log.id };
    });
  }

  async auditLogs(filter: { propertyId?: number; tenantId?: number }) {
    const where: any = {};
    if (filter.propertyId) where.propertyId = filter.propertyId;
    if (filter.tenantId) where.tenantId = filter.tenantId;
    return this.dataSource.getRepository(AuditLog).find({ where, order: { id: 'DESC' }, take: 300 });
  }
}
