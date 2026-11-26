// ===================================================================
//  Reference values taken from the RentalWorks database (Neon, Nov 2026).
//  Status / type columns are plain varchar in Postgres, not enums, so these
//  lists are the contract the front-end agrees on. Compare against them
//  only after normalizeStatus() (see utils/normalize.js).
// ===================================================================

export const ROLES = {
  TENANT: 'tenant',
  GUEST: 'guest',
  OWNER: 'owner',
  WARDEN: 'warden',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const STATUS = {
  booking: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'overdue'],
  bookingRequest: ['pending', 'approved', 'rejected'],
  payment: ['pending', 'verified', 'completed', 'success', 'failed', 'refunded'],
  complaint: ['open', 'in_progress', 'resolved'],
  issue: ['open', 'in_progress', 'resolved'],
  rentDue: ['upcoming', 'paid', 'overdue', 'waived'],
  serviceRequest: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
  room: ['available', 'full', 'maintenance'],
  property: ['pending', 'approved', 'rejected', 'offboarding'],
  subscription: ['pending', 'active', 'expired', 'cancelled'],
};

/** Payment statuses that count as money received. */
export const PAID_STATUSES = ['verified', 'completed', 'success', 'paid'];

export const PRIORITIES = ['low', 'medium', 'high'];

export const ISSUE_CATEGORIES = ['Internet/WiFi', 'Electrical', 'Plumbing', 'Appliances', 'Cleaning', 'Security', 'Other'];

export const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'NET'];

/** subscription_plans table. There is no public endpoint for it, so it is mirrored here. */
export const SUBSCRIPTION_PLANS = [
  {
    name: 'MONTHLY',
    displayName: 'Monthly',
    price: 499,
    durationMonths: 1,
    badge: null,
    features: ['List & Manage PG Properties', 'Tenant Management Tools', 'Basic Analytics Dashboard', 'Standard Email Support'],
  },
  {
    name: 'YEARLY',
    displayName: 'Yearly',
    price: 4999,
    durationMonths: 12,
    badge: 'Most Popular',
    features: [
      'List & Manage PG Properties',
      'Tenant Management & Room Allocation',
      'Advanced Analytics & Revenue Insights',
      'Priority Support 24/7',
      'Featured PG Listing Badge',
    ],
  },
  {
    name: 'LIFETIME',
    displayName: 'Lifetime',
    price: 14999,
    durationMonths: null,
    badge: 'Best Value',
    features: [
      'List Unlimited PG Properties',
      'All Advanced Analytics & Custom Reports',
      'VIP Dedicated Account Manager',
      'Top Priority Search Placement',
      'Lifetime Free Feature Updates',
      'Zero Renewal Fees Forever',
    ],
  },
];

export const PLAN_PRICES = Object.fromEntries(SUBSCRIPTION_PLANS.map((p) => [p.name, p.price]));

/** 'Monthly' | 'monthly' | 'MONTHLY' | 'Yearly Plan' → plan object, or null. */
export function findPlan(value) {
  const s = String(value || '').toUpperCase().replace(/\s*PLAN$/, '').trim();
  return SUBSCRIPTION_PLANS.find((p) => p.name === s) || null;
}

/** roommate_profiles lifestyle options, as stored. */
export const LIFESTYLE_OPTIONS = {
  sleepSchedule: ['Early Riser (6 AM - 11 PM)', 'Night Owl (12 AM - 8 AM)', 'Flexible Schedule'],
  cleanliness: ['High (Daily Cleanup)', 'Moderate & Organized'],
  foodHabit: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian / Non-Veg', 'Flexible Diet'],
  drinking: ['Non-Drinker', 'Occasional Drinker'],
  smoking: ['Non-Smoker', 'Occasional Smoker'],
};
