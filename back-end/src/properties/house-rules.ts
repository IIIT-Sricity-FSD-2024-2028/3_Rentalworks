/**
 * The tenant-facing part of an owner's policy (set on the owner's Policy
 * page). Only these fields are published with a property; everything else on
 * the owner account stays private.
 */
export type HouseRules = {
  rentDueDay: number | null;
  lateFeePerDay: number | null;
  securityDepositMonths: number | null;
  noticePeriodDays: number | null;
  leaseTermMonths: number | null;
  rentIncreasePercent: number | null;
  rentIncreaseFrequency: string | null;
  guestPolicy: string | null;
  guestHours: string | null;
  smokingAllowed: boolean | null;
  petsAllowed: boolean | null;
  maintenanceWindow: string | null;
};

const num = (v: unknown) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const str = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v));
const bool = (v: unknown) => (v === undefined || v === null ? null : Boolean(v));

export function houseRulesFrom(policy: Record<string, unknown> | null | undefined): HouseRules | null {
  if (!policy || typeof policy !== 'object' || !Object.keys(policy).length) return null;
  return {
    rentDueDay: num(policy.rentDueDay),
    lateFeePerDay: num(policy.lateFee),
    securityDepositMonths: num(policy.securityDeposit),
    noticePeriodDays: num(policy.noticePeriod),
    leaseTermMonths: num(policy.leaseTermMonths),
    rentIncreasePercent: num(policy.rentIncrease),
    rentIncreaseFrequency: str(policy.rentIncreaseFrequency),
    guestPolicy: str(policy.guestPolicy),
    guestHours: str(policy.guestHours),
    smokingAllowed: bool(policy.smokingAllowed),
    petsAllowed: bool(policy.petsAllowed),
    maintenanceWindow: str(policy.maintenanceWindow),
  };
}

/** Owner fields anyone may see on a listing: who to contact. */
export function publicOwner(owner: { id: number; name?: string; email?: string; phone?: string } | null | undefined) {
  return owner ? { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone } : null;
}
