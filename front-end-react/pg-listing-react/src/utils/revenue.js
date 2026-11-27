import { PAID_STATUSES } from '../data/catalog';
import { monthKey } from './months';
import { formatINR, normalizeStatus, toNumber } from './normalize';

export function sumMoney(rows, getValue) {
  return rows.reduce((total, row) => total + Math.round(toNumber(getValue(row)) * 100), 0) / 100;
}

export function recordedCommissions(payments) {
  return payments.filter((payment) => PAID_STATUSES.includes(normalizeStatus(payment.status)));
}

export function monthlyPlatformRevenue(months, commissions, subscriptions) {
  return months.map(({ key }) => {
    const fees = commissions.filter((payment) => monthKey(payment.paidDate || payment.createdAt) === key);
    const payments = subscriptions.filter((payment) => monthKey(payment.paymentDate) === key);
    return sumMoney(fees, (payment) => payment.platformFee) + sumMoney(payments, (payment) => payment.amount);
  });
}

export function formatSubscriptionAmount({ amount, currency }) {
  return !currency || currency === 'INR'
    ? formatINR(amount)
    : `${currency} ${toNumber(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
