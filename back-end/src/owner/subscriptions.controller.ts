import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { DataSource, Not, Repository, In } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, findOr404 } from '../common/crud';
import { Subscription } from './subscription.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { SUBSCRIPTION_PLANS, planPeriod, planTypeOf } from './subscription-plans';

const ACTIVE = 'active';
// Older rows were saved as 'ACTIVE'; match both spellings when finding or closing the current plan.
const ANY_ACTIVE = In(['active', 'ACTIVE']);

/**
 * CRUD for owner subscriptions — the single source of truth for an owner's plan.
 * Owners choose, change and cancel their OWN plan; admins can only view them.
 * Price and dates always come from the plan catalog, never from the form.
 */
@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(RolesGuard)
export class SubscriptionsController {
  constructor(@InjectRepository(Subscription) private readonly repo: Repository<Subscription>, private readonly db: DataSource) {}

  /** Keep users.subscriptionPlan / subscriptionFee in step for older screens that read them. */
  private async syncOwner(ownerId: number) {
    const current = await this.repo.findOne({ where: { ownerId, status: ANY_ACTIVE }, order: { id: 'DESC' } });
    const type = planTypeOf(current?.planType || current?.planName);
    await this.db.getRepository(User).update(
      { id: ownerId },
      {
        subscriptionPlan: current ? (type ? SUBSCRIPTION_PLANS[type].displayName : current.planName || current.planType) : (null as any),
        subscriptionFee: current ? Number(current.amount ?? current.monthlyFee ?? 0) : (0 as any),
      },
    );
  }

  private async notify(ownerId: number, title: string, message: string, byUserId: number) {
    await this.db.getRepository(Notification).save({
      title,
      message,
      type: 'info',
      priority: 'normal',
      userId: ownerId,
      byUserId,
      targetRole: 'owner',
      sentAt: new Date().toISOString(),
    } as Partial<Notification>);
  }

  private planFields(planType: string) {
    const type = planTypeOf(planType);
    if (!type) throw new BadRequestException(`planType must be one of: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`);
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

  @Get()
  @Roles('admin', 'owner')
  list(@Req() req: { user: AuthUser }) {
    const where = req.user.role === 'owner' ? { ownerId: req.user.id } : {};
    return this.repo.find({ where, relations: { owner: true }, order: { id: 'DESC' } });
  }

  /** The signed-in owner activates or switches their plan. Any earlier active plan is closed as 'replaced'. */
  @Post()
  @Roles('owner')
  async create(@Req() req: { user: AuthUser }, @Body() body: { planType?: string }) {
    // Always the caller's own account; an ownerId in the body is ignored.
    const ownerId = req.user.id;
    const owner = await this.db.getRepository(User).findOneBy({ id: ownerId, role: 'owner' });
    if (!owner) throw new BadRequestException('Only an owner account can choose a plan');
    const fields = this.planFields(String(body.planType || ''));
    await this.repo.update({ ownerId, status: ANY_ACTIVE }, { status: 'replaced' });
    const saved = await this.repo.save(this.repo.create({ ownerId, status: ACTIVE, currency: 'INR', ...fields } as Partial<Subscription>));
    await this.syncOwner(ownerId);
    await this.notify(ownerId, 'Subscription activated', `Your ${fields.planName} plan is active${fields.endDate ? ` until ${fields.endDate}` : ''}.`, req.user.id);
    return saved;
  }

  /** The owner changes their own plan (restarts the period) or cancels it. */
  @Patch(':id')
  @Roles('owner')
  async update(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number, @Body() body: { planType?: string; status?: string }) {
    const row = await findOr404(this.repo, id, 'Subscription');
    if (row.ownerId !== req.user.id) throw new ForbiddenException('You can only change your own plan');
    if (body.planType) Object.assign(row, this.planFields(body.planType));
    if (body.status) {
      const status = String(body.status).toLowerCase();
      if (!['active', 'cancelled'].includes(status)) throw new BadRequestException('status must be active or cancelled');
      if (status === ACTIVE) await this.repo.update({ ownerId: row.ownerId, status: ANY_ACTIVE, id: Not(row.id) }, { status: 'replaced' });
      row.status = status;
    }
    const saved = await this.repo.save(row);
    await this.syncOwner(row.ownerId);
    await this.notify(
      row.ownerId,
      saved.status === ACTIVE ? 'Subscription updated' : 'Subscription cancelled',
      saved.status === ACTIVE ? `Your plan is now ${saved.planName}${saved.endDate ? ` until ${saved.endDate}` : ''}.` : `Your ${saved.planName || saved.planType} plan was cancelled.`,
      req.user.id,
    );
    return saved;
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number) {
    const row = await findOr404(this.repo, id, 'Subscription');
    if (row.ownerId !== req.user.id) throw new ForbiddenException('You can only remove your own plan');
    await this.repo.remove(row);
    await this.syncOwner(row.ownerId);
    return { id };
  }
}
