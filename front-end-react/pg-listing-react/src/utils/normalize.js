// ===================================================================
//  One place to clean up values exactly as the database stores them.
//
//  The Neon tables were written by several code paths over time, so the
//  same idea shows up in more than one spelling:
//    complaints.status      'in-progress' and 'in_progress'
//    subscriptions.status   'active' and 'ACTIVE'
//    bookings.duration      '6 Months' and '6 months'
//    properties.amenities   'wifi' and 'WiFi', 'meals' and 'Mess'
//    numeric columns        returned by pg as strings ('499.00')
//  Everything that reads API data should go through these helpers so the
//  pages only ever see one spelling.
// ===================================================================

// ------------------------------------------------------------ status

/** 'In-Progress', 'in progress', 'IN_PROGRESS' → 'in_progress'. */
export function normalizeStatus(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const STATUS_LABELS = {
  in_progress: 'In Progress',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  waived: 'Waived',
};

/** 'in_progress' → 'In Progress'. Accepts any spelling. */
export function statusLabel(value, fallback = '—') {
  const s = normalizeStatus(value);
  if (!s) return fallback;
  return STATUS_LABELS[s] || s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Copy of a row with its `status` normalised. Leaves every other field alone. */
export function withNormalizedStatus(row) {
  if (!row || typeof row !== 'object' || row.status === undefined || row.status === null) return row;
  return { ...row, status: normalizeStatus(row.status) };
}

// ------------------------------------------------------------ numbers & money

/** pg returns numeric columns as strings. '499.00' → 499, junk → fallback. */
export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** 4999 → '₹4,999'. */
export const formatINR = (value) => `₹${toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ------------------------------------------------------------ dates

/** Date | ISO string | 'YYYY-MM-DD' → Date, or null when missing/invalid. */
export function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** '2026-10-17T10:36:45.745Z' → '17 Oct 2026'. */
export function formatDate(value, fallback = '—') {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : fallback;
}

/** '2026-10-17T10:36:45.745Z' → '17 Oct 2026, 4:06 pm'. */
export function formatDateTime(value, fallback = '—') {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : fallback;
}

/** Any date value → 'YYYY-MM-DD' (local), or ''. */
export function toISODate(value) {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ------------------------------------------------------------ durations

/** '6 Months' | '6 months' | '12' | 6 → 6. Unknown → 0. */
export function parseDurationMonths(value) {
  if (typeof value === 'number') return value > 0 ? value : 0;
  const m = String(value || '').match(/(\d+)\s*(year|yr|month|mon|m)?/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return /^y/i.test(m[2] || '') ? n * 12 : n;
}

/** Any duration spelling → '6 Months' / '1 Month'. */
export function formatDuration(value, fallback = '—') {
  const n = parseDurationMonths(value);
  return n ? `${n} ${n === 1 ? 'Month' : 'Months'}` : fallback;
}

// ------------------------------------------------------------ JSON-ish columns

/** jsonb array, JSON text ('["a","b"]'), comma list, or nothing → array. */
export function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        /* fall through to comma split */
      }
    }
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

// ------------------------------------------------------------ amenities

/**
 * Canonical amenity keys used by filters and icons. `aliases` covers every
 * spelling present in properties.amenities today plus obvious variants.
 */
export const AMENITIES = {
  wifi: { label: 'WiFi', icon: 'wifi', aliases: ['wi-fi', 'wi fi', 'internet'] },
  ac: { label: 'AC', icon: 'ac_unit', aliases: ['air conditioning', 'air conditioner', 'a/c'] },
  meals: { label: 'Meals', icon: 'restaurant', aliases: ['mess', 'food', 'meal', 'canteen'] },
  laundry: { label: 'Laundry', icon: 'local_laundry_service', aliases: ['washing machine'] },
  parking: { label: 'Parking', icon: 'local_parking', aliases: [] },
  cctv: { label: 'CCTV', icon: 'videocam', aliases: ['cctv security', 'camera'] },
  security: { label: 'Security', icon: 'security', aliases: ['security guard', '24/7 security'] },
  backup: { label: 'Power Backup', icon: 'battery_charging_full', aliases: ['power backup', 'power', 'generator', 'inverter'] },
  water: { label: 'Water Supply', icon: 'water_drop', aliases: ['water supply', 'ro water', 'drinking water'] },
  geyser: { label: 'Geyser', icon: 'hot_tub', aliases: ['hot water', 'water heater'] },
  housekeeping: { label: 'Housekeeping', icon: 'cleaning_services', aliases: ['cleaning', 'room cleaning'] },
  gym: { label: 'Gym', icon: 'fitness_center', aliases: [] },
  'attached-bathroom': { label: 'Attached Bathroom', icon: 'bathtub', aliases: ['attached bathroom', 'attached washroom'] },
};

const AMENITY_LOOKUP = Object.entries(AMENITIES).reduce((acc, [key, { label, aliases }]) => {
  [key, label, ...aliases].forEach((s) => {
    acc[s.toLowerCase()] = key;
  });
  return acc;
}, {});

/** 'WiFi' | 'wifi' | 'Mess' | 'Power Backup' → 'wifi' | 'wifi' | 'meals' | 'backup'. */
export function amenityKey(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  return AMENITY_LOOKUP[s] || s.replace(/\s+/g, '-');
}

/** Any spelling → display label. Unknown amenities are title-cased. */
export function amenityLabel(value) {
  const key = amenityKey(value);
  if (AMENITIES[key]) return AMENITIES[key].label;
  // Custom amenities typed by the owner may arrive as slugs: 'rooftop-garden' → 'Rooftop Garden'.
  return String(value || '').trim().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Any spelling → Material icon name. */
export const amenityIcon = (value) => AMENITIES[amenityKey(value)]?.icon || 'check_circle';

/** Raw amenities column → de-duplicated canonical keys. */
export const normalizeAmenities = (value) => [...new Set(parseList(value).map(amenityKey).filter(Boolean))];

// ------------------------------------------------------------ text

/** 'Chennai, tamilnadu' → 'Chennai, Tamilnadu'. Leaves already-cased words alone. */
export const titleCaseWords = (value) => String(value || '').replace(/\b([a-z])/g, (c) => c.toUpperCase());

/** City from a free-text location when properties.city is empty: 'Anna Nagar, Chennai' → 'Chennai'. */
export function cityFromLocation(location) {
  const parts = String(location || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return '';
  // 'Koramangala, Bangalore' → 'Bangalore'; 'Trichy, Tamil Nadu' → 'Trichy' (last part is a state).
  const STATES = ['tamil nadu', 'tamilnadu', 'karnataka', 'kerala', 'maharashtra', 'telangana', 'andhra pradesh', 'delhi'];
  const last = parts[parts.length - 1];
  if (STATES.includes(last.toLowerCase()) && parts.length > 1) return titleCaseWords(parts[parts.length - 2]);
  return titleCaseWords(last);
}
