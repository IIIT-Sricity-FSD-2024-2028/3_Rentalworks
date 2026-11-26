/** Owner subscription plans. The frontend catalog (data/catalog.js) shows the same list. */
export const SUBSCRIPTION_PLANS = {
  MONTHLY: { displayName: 'Monthly', price: 499, months: 1 as number | null },
  YEARLY: { displayName: 'Yearly', price: 4999, months: 12 as number | null },
  LIFETIME: { displayName: 'Lifetime', price: 14999, months: null as number | null },
};
export type PlanType = keyof typeof SUBSCRIPTION_PLANS;

/** 'Yearly' / 'yearly plan' / 'YEARLY' → 'YEARLY'; unknown legacy names (e.g. 'Premium') → null. */
export function planTypeOf(value?: string | null): PlanType | null {
  const key = String(value || '').toUpperCase().replace(/\s*PLAN$/, '').trim();
  return key in SUBSCRIPTION_PLANS ? (key as PlanType) : null;
}

/** Start today; end after the plan's duration (no end for lifetime). */
export function planPeriod(type: PlanType, start = new Date()) {
  const months = SUBSCRIPTION_PLANS[type].months;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (!months) return { startDate: iso(start), endDate: null as string | null };
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return { startDate: iso(start), endDate: iso(end) };
}
