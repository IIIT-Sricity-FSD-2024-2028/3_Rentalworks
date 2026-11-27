// Constants and helpers shared by the super admin control pages.

export const ACCOUNT_TONE = { active: 'green', pending: 'amber', suspended: 'red', blocked: 'red', inactive: 'slate', evicted: 'red' };
export const ROLE_TONE = { super_admin: 'purple', admin: 'indigo', owner: 'blue', warden: 'amber', tenant: 'green', guest: 'slate' };
export const ROLE_LABEL = { super_admin: 'Super admin', admin: 'Admin', owner: 'Owner', warden: 'Warden', tenant: 'Tenant', guest: 'Guest' };

/** A random password the user can type: no look-alike characters. */
export function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('') + '@1';
}

/** Download rows as a CSV file (client-side). */
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const cellStyle = { padding: '12px 16px', fontSize: 13, verticalAlign: 'middle' };
export const subText = { fontSize: 11, color: '#64748b', marginTop: 2 };
export const iconBtn = (danger) => ({
  border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '5px 7px', cursor: 'pointer',
  color: danger ? '#b91c1c' : '#334155', display: 'inline-flex', alignItems: 'center',
});

export const daysUntil = (date) => {
  if (!date) return null;
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
};
