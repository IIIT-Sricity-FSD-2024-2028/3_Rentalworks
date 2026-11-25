import { EntityManager } from 'typeorm';
import { RentDue } from './rent-due.entity';

/* ---------- date helpers (all dates are 'YYYY-MM-DD' strings in Asia/Kolkata) ---------- */

/** Today's calendar date in India. Using UTC would be a day behind between 00:00 and 05:30 IST. */
export const todayIST = (): string => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

const parts = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
};
const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Adds whole months to an anchor date, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsClamped(iso: string, months: number): string {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** a - b in whole days. */
export function diffDays(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86_400_000);
}

/** Billing cycles are anchored on the move-in date: cycle 1 starts on move-in, cycle 2 one month later, ... */
export const cycleStart = (anchor: string, cycleNo: number): string => addMonthsClamped(anchor, cycleNo - 1);
export const cycleEnd = (anchor: string, cycleNo: number): string => addDays(cycleStart(anchor, cycleNo + 1), -1);

/** Highest cycle number whose start is on/before `today` (at least 1). */
export function currentCycleNo(anchor: string, today: string): number {
  let n = 1;
  while (n < 600 && cycleStart(anchor, n + 1) <= today) n++;
  return n;
}

/** '6 Months' -> 6 ; anything unparseable -> null (no cap). */
export function durationMonths(duration?: string | null): number | null {
  const n = parseInt(String(duration || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Status of an UNPAID due on a given day. Paid / waived dues keep their status. */
export function classifyUnpaid(dueDate: string, today: string): 'upcoming' | 'due_soon' | 'overdue' {
  const daysToDue = diffDays(dueDate, today);
  if (daysToDue < 0) return 'overdue'; // 1+ days past the due date
  if (daysToDue <= 3) return 'due_soon';
  return 'upcoming';
}

/**
 * Cycle 1 of a brand-new tenancy: it is paid by the booking payment itself.
 * Called from inside the checkout transaction so booking, payment, stay and ledger commit together.
 */
export async function createInitialDue(
  manager: EntityManager,
  args: {
    tenantId: number;
    stayId?: number;
    bookingId?: number;
    propertyId: number;
    roomId?: number;
    checkIn: string;
    rent: number;
    paymentId: number;
  },
): Promise<RentDue> {
  const repo = manager.getRepository(RentDue);
  const due = repo.create({
    tenantId: args.tenantId,
    stayId: args.stayId ?? null,
    bookingId: args.bookingId ?? null,
    propertyId: args.propertyId,
    roomId: args.roomId ?? null,
    cycleNo: 1,
    periodStart: cycleStart(args.checkIn, 1),
    periodEnd: cycleEnd(args.checkIn, 1),
    amount: args.rent,
    dueDate: cycleStart(args.checkIn, 1),
    status: 'paid',
    paymentId: args.paymentId,
    paidAt: new Date(),
    paidVia: 'online',
  });
  return repo.save(due);
}
