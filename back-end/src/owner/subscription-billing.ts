import { EntityManager, In } from 'typeorm';
import { Subscription } from './subscription.entity';
import { PlanType, SUBSCRIPTION_PLANS, planTypeOf } from './subscription-plans';

/**
 * Price of changing an owner's plan.
 *
 *  - new        no running plan (none, cancelled or expired) → pay the full price
 *  - upgrade    a dearer plan → pay its price minus the unused value of the
 *               running plan (credit = price × days left / days in period;
 *               a lifetime plan never runs down). Yearly bought today →
 *               Lifetime costs 14999 − 4999 = 10000.
 *  - downgrade  a cheaper plan → nothing to pay, nothing refunded; the owner
 *               must confirm that. The cheaper plan starts today.
 *  - same       already on this plan → refused.
 *
 * The server always recomputes this; the browser only displays it.
 */

export type PlanChangeKind = 'new' | 'upgrade' | 'downgrade' | 'same';

export const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const DAY = 86_400_000;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const asDay = (v: string | Date | null | undefined) =>
  v ? (v instanceof Date ? isoDay(v) : String(v)).slice(0, 10) : null;

export const ANY_ACTIVE = In(['active', 'ACTIVE']);

export function planDurationLabel(type: PlanType) {
  const months = SUBSCRIPTION_PLANS[type].months;
  return months === 1
    ? '1 Month'
    : months === 12
      ? '1 Year'
      : months
        ? `${months} Months`
        : 'Lifetime';
}

/** The plan the owner is on right now (active and not past its end date), or null. */
export async function runningPlan(
  manager: EntityManager,
  ownerId: number,
  today = isoDay(),
) {
  const row = await manager
    .getRepository(Subscription)
    .findOne({ where: { ownerId, status: ANY_ACTIVE }, order: { id: 'DESC' } });
  if (!row) return null;
  const end = asDay(row.endDate);
  if (end && end < today) return null; // expired
  return row;
}

export async function quotePlanChange(
  manager: EntityManager,
  ownerId: number,
  planType: PlanType,
  today = isoDay(),
) {
  const target = SUBSCRIPTION_PLANS[planType];
  const row = await runningPlan(manager, ownerId, today);

  let current: null | {
    id: number;
    planType: PlanType | null;
    displayName: string;
    price: number;
    startDate: string | null;
    endDate: string | null;
    daysLeft: number | null;
    totalDays: number | null;
    unusedValue: number;
  } = null;

  if (row) {
    const type = planTypeOf(row.planType || row.planName);
    const price = Number(
      row.amount ??
        (type ? SUBSCRIPTION_PLANS[type].price : row.monthlyFee) ??
        0,
    );
    const start = asDay(row.startDate) || today;
    const end = asDay(row.endDate);
    let daysLeft: number | null = null;
    let totalDays: number | null = null;
    let unusedValue = price; // lifetime: never runs down
    if (end) {
      totalDays = Math.max(1, daysBetween(start, end));
      daysLeft = Math.min(totalDays, Math.max(0, daysBetween(today, end)));
      unusedValue = Math.round((price * daysLeft) / totalDays);
    }
    current = {
      id: row.id,
      planType: type,
      displayName: type
        ? SUBSCRIPTION_PLANS[type].displayName
        : row.planName || row.planType,
      price,
      startDate: start,
      endDate: end,
      daysLeft,
      totalDays,
      unusedValue,
    };
  }

  let kind: PlanChangeKind = 'new';
  if (current) {
    if (current.planType === planType) kind = 'same';
    else kind = target.price > current.price ? 'upgrade' : 'downgrade';
  }
  const credit =
    kind === 'upgrade' ? Math.min(current!.unusedValue, target.price) : 0;
  const amountDue =
    kind === 'new'
      ? target.price
      : kind === 'upgrade'
        ? Math.max(0, target.price - credit)
        : 0;

  return {
    quoteDate: today,
    kind,
    current,
    plan: {
      planType,
      displayName: target.displayName,
      price: target.price,
      months: target.months,
      duration: planDurationLabel(planType),
    },
    credit,
    amountDue,
    requiresPayment: amountDue > 0,
    // Losing paid-for time is never refunded, so the owner must agree first.
    requiresConfirmation: kind === 'downgrade',
    /** Ties a gateway order to exactly this change (owner, plan, plan replaced, price date). */
    receipt: `sub:${ownerId}:${planType}:${current?.id || 0}:${today}`,
  };
}

export type PlanQuote = Awaited<ReturnType<typeof quotePlanChange>>;
