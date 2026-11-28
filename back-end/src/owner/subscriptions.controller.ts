import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, findOr404 } from '../common/crud';
import { Subscription } from './subscription.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { SUBSCRIPTION_PLANS, planPeriod, planTypeOf, PlanType } from './subscription-plans';
import { ANY_ACTIVE, isoDay, quotePlanChange } from './subscription-billing';
import { PaymentGatewayService } from '../payments/payment-gateway.service';

const ACTIVE = 'active';
const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

type ChangeBody = {
  planType?: string;
  confirmNoRefund?: boolean;
  quoteDate?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
};

/**
 * CRUD for owner subscriptions — the single source of truth for an owner's plan.
 * Owners choose, change and cancel their OWN plan; admins can only view them.
 * Price and dates always come from the plan catalog, never from the form.
 */
@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(RolesGuard)
export class SubscriptionsController {
  constructor(
    @InjectRepository(Subscription) private readonly repo: Repository<Subscription>,
    private readonly db: DataSource,
    private readonly gateway: PaymentGatewayService,
  ) {}

  /** Keep users.subscriptionPlan / subscriptionFee in step for older screens that read them. */
  private async syncOwner(manager: EntityManager, ownerId: number) {
    const current = await manager.getRepository(Subscription).findOne({ where: { ownerId, status: ANY_ACTIVE }, order: { id: 'DESC' } });
    const type = planTypeOf(current?.planType || current?.planName);
    await manager.getRepository(User).update(
      { id: ownerId },
      {
        subscriptionPlan: current ? (type ? SUBSCRIPTION_PLANS[type].displayName : current.planName || current.planType) : (null as any),
        subscriptionFee: current ? Number(current.amount ?? current.monthlyFee ?? 0) : (0 as any),
      },
    );
  }

  /** Tell the owner, and every active admin, what changed. */
  private async notify(manager: EntityManager, owner: User, title: string, ownerMessage: string, adminMessage: string) {
    const notes = manager.getRepository(Notification);
    const sentAt = new Date().toISOString();
    await notes.save({ title, message: ownerMessage, type: 'info', priority: 'normal', userId: owner.id, byUserId: owner.id, targetRole: 'owner', sentAt } as Partial<Notification>);
    const admins = await manager.getRepository(User).findBy({ role: 'admin', status: 'active' });
    for (const admin of admins) {
      // No byUserId here: the owner's feed lists notes they sent, and this copy is for the admin only.
      await notes.save({ title, message: adminMessage, type: 'info', priority: 'normal', userId: admin.id, targetRole: 'admin', sentAt } as Partial<Notification>);
    }
  }

  private planType(value?: string): PlanType {
    const type = planTypeOf(value);
    if (!type) throw new BadRequestException(`planType must be one of: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`);
    return type;
  }

  private planFields(type: PlanType) {
    const plan = SUBSCRIPTION_PLANS[type];
    return {
      planType: type,
      planName: plan.displayName,
      amount: plan.price,
      monthlyFee: plan.months ? Math.round(plan.price / plan.months) : plan.price,
      billingCycle: plan.months === 1 ? 'monthly' : plan.months === 12 ? 'yearly' : 'one-time',
      ...planPeriod(type),
    };
  }

  private async ownerAccount(id: number) {
    const owner = await this.db.getRepository(User).findOneBy({ id, role: 'owner' });
    if (!owner) throw new BadRequestException('Only an owner account can choose a plan');
    return owner;
  }

  @Get()
  @Roles('admin', 'owner')
  list(@Req() req: { user: AuthUser }) {
    const where = req.user.role === 'owner' ? { ownerId: req.user.id } : {};
    return this.repo.find({ where, relations: { owner: true }, order: { id: 'DESC' } });
  }

  /** What switching to `planType` costs the signed-in owner right now (shown before paying / confirming). */
  @Get('quote')
  @Roles('owner')
  async quote(@Req() req: { user: AuthUser }, @Query('planType') planType?: string) {
    await this.ownerAccount(req.user.id);
    const quote = await quotePlanChange(this.db.manager, req.user.id, this.planType(planType));
    // The receipt is internal (it ties a gateway order to this change).
    const shown: Partial<typeof quote> = { ...quote };
    delete shown.receipt;
    return { ...shown, gatewayMode: this.gateway.mode };
  }

  /**
   * The signed-in owner starts or changes their plan.
   *  new / upgrade -> body carries the gateway proof for exactly the quoted amount
   *  downgrade     -> body.confirmNoRefund must be true (unused value is not refunded)
   * The earlier plan is closed as 'replaced'; a paid change is written to the
   * subscription_payments ledger (admin / super-admin revenue reads it).
   */
  @Post()
  @Roles('owner')
  async create(@Req() req: { user: AuthUser }, @Body() body: ChangeBody) {
    // Always the caller's own account; an ownerId in the body is ignored.
    const owner = await this.ownerAccount(req.user.id);
    const type = this.planType(body.planType);
    const paying = Boolean(body.gatewayOrderId || body.gatewayPaymentId);

    // A payment is checked against the price on the day its order was made
    // (so paying just after midnight still matches). Only today or yesterday.
    const today = isoDay();
    const yesterday = isoDay(new Date(Date.now() - 86_400_000));
    const quoteDate = paying && body.quoteDate && [today, yesterday].includes(body.quoteDate) ? body.quoteDate : today;
    const quote = await quotePlanChange(this.db.manager, owner.id, type, quoteDate);

    if (quote.kind === 'same') throw new BadRequestException(`You are already on the ${quote.plan.displayName} plan.`);
    if (quote.requiresConfirmation && body.confirmNoRefund !== true) {
      throw new BadRequestException(
        `Switching from ${quote.current?.displayName} to ${quote.plan.displayName} cannot be undone and the unused amount is not refunded. Please confirm to continue.`,
      );
    }

    let payment: { transactionId: string; mode: 'razorpay' | 'test' } | null = null;
    if (quote.requiresPayment) {
      if (!paying) throw new BadRequestException(`Please pay ${inr(quote.amountDue)} to ${quote.kind === 'upgrade' ? 'upgrade to' : 'activate'} the ${quote.plan.displayName} plan.`);
      payment = await this.gateway.verify(
        { orderId: body.gatewayOrderId, paymentId: body.gatewayPaymentId, signature: body.gatewaySignature },
        quote.amountDue,
        quote.receipt,
      );
    }

    const fields = this.planFields(type);
    try {
      return await this.db.transaction(async (manager) => {
        const subs = manager.getRepository(Subscription);
        // Serialise plan changes per owner and make sure nothing changed since the quote.
        await manager.getRepository(User).createQueryBuilder('u').setLock('pessimistic_write').where('u.id = :id', { id: owner.id }).getOne();
        const running = await quotePlanChange(manager, owner.id, type, quoteDate);
        if ((running.current?.id || 0) !== (quote.current?.id || 0)) {
          throw new BadRequestException('Your plan changed in the meantime. Please reload the page and try again.');
        }

        await subs.update({ ownerId: owner.id, status: ANY_ACTIVE }, { status: 'replaced' });
        const saved = await subs.save(subs.create({ ownerId: owner.id, status: ACTIVE, currency: 'INR', ...fields } as Partial<Subscription>));

        let receiptNumber: string | null = null;
        if (payment) {
          const [row]: { id: number }[] = await manager.query(
            `INSERT INTO subscription_payments
               ("ownerId", "subscriptionId", "planType", "transactionId", "orderId", amount, currency, "paymentMethod", status, "paymentDate", "planDuration")
             VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, 'SUCCESS', $8, $9) RETURNING id`,
            [owner.id, saved.id, type, payment.transactionId, body.gatewayOrderId, quote.amountDue, payment.mode === 'razorpay' ? 'Razorpay' : 'TestGateway', today, quote.plan.duration],
          );
          receiptNumber = `RB-${today.slice(0, 4)}-${String(row.id).padStart(6, '0')}`;
          await manager.query(`UPDATE subscription_payments SET "receiptNumber" = $1 WHERE id = $2`, [receiptNumber, row.id]);
        }

        await this.syncOwner(manager, owner.id);

        const until = fields.endDate ? ` until ${fields.endDate}` : ' for life';
        const from = quote.current?.displayName;
        const who = owner.name || owner.email || `Owner #${owner.id}`;
        if (quote.kind === 'upgrade') {
          await this.notify(
            manager,
            owner,
            'Subscription upgraded',
            `You upgraded from ${from} to ${fields.planName}, valid${until}. Paid ${inr(quote.amountDue)} (${inr(quote.credit)} credit for your unused ${from} plan). Receipt ${receiptNumber}.`,
            `${who} upgraded from ${from} to ${fields.planName} and paid ${inr(quote.amountDue)}.`,
          );
        } else if (quote.kind === 'downgrade') {
          await this.notify(
            manager,
            owner,
            'Subscription changed',
            `You switched from ${from} to ${fields.planName}, valid${until}. The unused amount of your ${from} plan was not refunded.`,
            `${who} switched from ${from} to ${fields.planName} (no payment, no refund).`,
          );
        } else {
          await this.notify(
            manager,
            owner,
            'Subscription activated',
            `Your ${fields.planName} plan is active${until}. Paid ${inr(quote.amountDue)}. Receipt ${receiptNumber}.`,
            `${who} activated the ${fields.planName} plan and paid ${inr(quote.amountDue)}.`,
          );
        }

        return { ...saved, change: { kind: quote.kind, from: from || null, credit: quote.credit, amountPaid: payment ? quote.amountDue : 0, receiptNumber } };
      });
    } catch (err) {
      // The ledger's unique index stops one payment being used twice (e.g. a double click).
      if ((err as { code?: string })?.code === '23505') throw new BadRequestException('This payment has already been used');
      throw err;
    }
  }

  /**
   * The owner cancels their own plan (the only change allowed here; switching
   * plans goes through POST so it is priced). Nothing is refunded, so the
   * owner must confirm with confirmNoRefund: true.
   */
  @Patch(':id')
  @Roles('owner')
  async update(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number, @Body() body: { planType?: string; status?: string; confirmNoRefund?: boolean }) {
    const row = await findOr404(this.repo, id, 'Subscription');
    if (row.ownerId !== req.user.id) throw new ForbiddenException('You can only change your own plan');
    if (body.planType) throw new BadRequestException('To change your plan, choose it on the Subscription page (upgrades are paid there).');
    const status = String(body.status || '').toLowerCase();
    if (status !== 'cancelled') throw new BadRequestException("Only status 'cancelled' can be set here");
    if (String(row.status).toLowerCase() !== ACTIVE) throw new BadRequestException('This plan is not active');
    if (body.confirmNoRefund !== true) {
      throw new BadRequestException('Cancelling cannot be undone and the unused amount is not refunded. Please confirm to continue.');
    }
    const owner = await this.ownerAccount(req.user.id);
    return this.db.transaction(async (manager) => {
      row.status = 'cancelled';
      row.endDate = isoDay();
      const saved = await manager.getRepository(Subscription).save(row);
      await this.syncOwner(manager, row.ownerId);
      const name = saved.planName || saved.planType;
      await this.notify(
        manager,
        owner,
        'Subscription cancelled',
        `Your ${name} plan was cancelled today. The unused amount was not refunded.`,
        `${owner.name || owner.email || `Owner #${owner.id}`} cancelled the ${name} plan.`,
      );
      return saved;
    });
  }

  /** Remove an old (replaced / cancelled) plan row. A running plan must be cancelled first; paid rows stay as records. */
  @Delete(':id')
  @Roles('owner')
  async remove(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number) {
    const row = await findOr404(this.repo, id, 'Subscription');
    if (row.ownerId !== req.user.id) throw new ForbiddenException('You can only remove your own plan');
    if (String(row.status).toLowerCase() === ACTIVE) throw new BadRequestException('Cancel this plan before removing it');
    const [paid]: unknown[] = await this.db.query('SELECT 1 FROM subscription_payments WHERE "subscriptionId" = $1 LIMIT 1', [id]);
    if (paid) throw new BadRequestException('This plan has a payment on record and is kept for your receipts');
    await this.repo.remove(row);
    return { id };
  }
}
