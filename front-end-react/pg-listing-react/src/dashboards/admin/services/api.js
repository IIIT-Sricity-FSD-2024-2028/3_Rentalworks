// Admin helpers. CRUD calls live in the repository slices
// (features/repositories); this file only derives subscription views.
import { findPlan } from '../../../data/catalog';
import { normalizeStatus, toNumber, toISODate } from '../../../utils/normalize';

/**
 * One row per owner, from the subscriptions table (the single source of truth).
 * The owner's current plan is their latest active row; otherwise their latest
 * row of any status; owners who never had a plan show as INACTIVE.
 */
export function deriveSubscriptions(users = [], rows = []) {
  const today = new Date().toISOString().slice(0, 10);
  return users
    .filter((u) => u.role === 'owner')
    .map((o) => {
      const mine = rows.filter((r) => Number(r.ownerId) === Number(o.id)).sort((a, b) => b.id - a.id);
      const row = mine.find((r) => normalizeStatus(r.status) === 'active') || mine[0] || null;
      // Older rows keep the plan in planType only, newer ones in both.
      const plan = row ? findPlan(row.planType) || findPlan(row.planName) : null;
      const planType = row ? plan?.name || String(row.planType || row.planName || '').toUpperCase() : 'NONE';
      const rowStatus = row ? normalizeStatus(row.status) : '';
      const expired = rowStatus === 'active' && row.endDate && String(row.endDate).slice(0, 10) < today;
      const status = !row ? 'INACTIVE' : expired ? 'EXPIRED' : rowStatus === 'active' ? 'ACTIVE' : rowStatus === 'cancelled' ? 'CANCELLED' : 'INACTIVE';
      return {
        id: o.id,
        ownerId: o.id,
        subscriptionId: row?.id ?? null,
        owner: { name: o.name, email: o.email },
        planType,
        plan: { displayName: !row ? 'No plan' : `${plan?.displayName || planType.charAt(0) + planType.slice(1).toLowerCase()} Plan` },
        amount: row ? toNumber(row.amount) || toNumber(row.monthlyFee) || plan?.price || 0 : 0,
        startDate: row ? toISODate(row.startDate) || null : null,
        endDate: row ? toISODate(row.endDate) || null : null,
        status,
        evaluatedStatus: status,
        receiptNumber: row ? `SUB-${String(row.id).padStart(5, '0')}` : null,
        paymentId: row?.id ?? null,
      };
    });
}

export function subscriptionStats(subs = []) {
  const active = subs.filter((s) => s.status === 'ACTIVE');
  const count = (p) => active.filter((s) => s.planType === p).length;
  return {
    subscriptions: { totalActive: active.length, monthly: count('MONTHLY'), yearly: count('YEARLY'), lifetime: count('LIFETIME') },
    payments: { totalRevenue: active.reduce((sum, s) => sum + s.amount, 0) },
  };
}
