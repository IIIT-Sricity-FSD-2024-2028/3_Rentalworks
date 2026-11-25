const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date-ish value → "YYYY-M" bucket, or null when it is not a date. */
export function monthKey(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${d.getMonth()}` : null;
}

/** The last `n` calendar months, oldest first. */
export function lastMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: NAMES[d.getMonth()] };
  });
}
