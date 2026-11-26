import React from 'react';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// Values come from the owner Policy page.
const GUESTS = { allowed: 'Guests allowed', restricted: 'Guests allowed with prior permission', 'not-allowed': 'No guests allowed' };
const FREQUENCY = { yearly: 'once a year', 'half-yearly': 'every six months' };

/** Turn the owner's policy into plain-language lines. Unset values are skipped. */
export function houseRuleLines(r) {
  if (!r) return [];
  const lines = [];
  if (r.rentDueDay) lines.push({ icon: '📅', label: 'Rent due', text: `By the ${ordinal(r.rentDueDay)} of every month` });
  if (r.lateFeePerDay) lines.push({ icon: '⏰', label: 'Late fee', text: `₹${r.lateFeePerDay} per day after the due date` });
  if (r.securityDepositMonths) lines.push({ icon: '🔐', label: 'Security deposit', text: r.securityDepositMonths === 1 ? "1 month's rent" : `${r.securityDepositMonths} months' rent` });
  if (r.noticePeriodDays) lines.push({ icon: '📝', label: 'Notice to move out', text: plural(r.noticePeriodDays, 'day') });
  if (r.leaseTermMonths) lines.push({ icon: '📄', label: 'Lease term', text: plural(r.leaseTermMonths, 'month') });
  if (r.rentIncreaseFrequency === 'never') lines.push({ icon: '📈', label: 'Rent revision', text: 'Rent is not revised during your stay' });
  else if (r.rentIncreasePercent) lines.push({ icon: '📈', label: 'Rent revision', text: `Up to ${r.rentIncreasePercent}%${r.rentIncreaseFrequency ? ` ${FREQUENCY[r.rentIncreaseFrequency] || r.rentIncreaseFrequency}` : ''}` });
  if (r.guestPolicy) lines.push({ icon: '👥', label: 'Guests', text: `${GUESTS[r.guestPolicy] || r.guestPolicy}${r.guestHours && r.guestPolicy !== 'not-allowed' ? ` (${r.guestHours})` : ''}` });
  if (r.smokingAllowed !== null && r.smokingAllowed !== undefined) lines.push({ icon: r.smokingAllowed ? '🚬' : '🚭', label: 'Smoking', text: r.smokingAllowed ? 'Allowed in designated areas' : 'Not allowed' });
  if (r.petsAllowed !== null && r.petsAllowed !== undefined) lines.push({ icon: '🐾', label: 'Pets', text: r.petsAllowed ? 'Allowed' : 'Not allowed' });
  if (r.maintenanceWindow) lines.push({ icon: '🛠️', label: 'Maintenance visits', text: r.maintenanceWindow });
  return lines;
}

/**
 * The owner's house rules, as set on the owner Policy page. Shown on the
 * PG details page and on the booking review before the tenant agrees.
 */
export default function HouseRules({ rules, compact = false }) {
  const lines = houseRuleLines(rules);
  if (!lines.length) return <p style={{ color: '#64748b', margin: 0 }}>The owner hasn't published house rules yet. Ask them before you book.</p>;
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: compact ? 6 : 12,
        margin: 0,
      }}
    >
      {lines.map((l) => (
        <div
          key={l.label}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: compact ? '4px 0' : '12px 14px',
            border: compact ? 'none' : '1px solid #e2e8f0',
            borderRadius: 10,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: compact ? 16 : 20 }}>
            {l.icon}
          </span>
          <div>
            <dt style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{l.label}</dt>
            <dd style={{ margin: 0, fontSize: compact ? 13 : 15, color: '#1e293b' }}>{l.text}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
