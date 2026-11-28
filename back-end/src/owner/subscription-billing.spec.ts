import { quotePlanChange } from './subscription-billing';

/** A manager whose subscriptions repository returns `row` as the latest active plan. */
const managerWith = (row: any) =>
  ({ getRepository: () => ({ findOne: async () => row }) }) as any;
const TODAY = '2026-11-28';

describe('quotePlanChange', () => {
  it('charges the full price when there is no plan', async () => {
    const q = await quotePlanChange(managerWith(null), 1, 'YEARLY', TODAY);
    expect(q).toMatchObject({
      kind: 'new',
      amountDue: 4999,
      credit: 0,
      requiresPayment: true,
      requiresConfirmation: false,
    });
  });

  it('Yearly bought today -> Lifetime costs 10000', async () => {
    const row = {
      id: 5,
      planType: 'YEARLY',
      amount: '4999.00',
      startDate: TODAY,
      endDate: '2027-11-28',
      status: 'active',
    };
    const q = await quotePlanChange(managerWith(row), 1, 'LIFETIME', TODAY);
    expect(q).toMatchObject({
      kind: 'upgrade',
      credit: 4999,
      amountDue: 10000,
    });
    expect(q.receipt).toBe(`sub:1:LIFETIME:5:${TODAY}`);
  });

  it('gives credit only for the unused part of the period', async () => {
    // 365-day yearly plan with 73 days left -> credit 4999 * 73 / 365 = 1000
    const row = {
      id: 6,
      planType: 'YEARLY',
      amount: '4999.00',
      startDate: '2026-02-08',
      endDate: '2027-02-08',
      status: 'active',
    };
    const q = await quotePlanChange(
      managerWith(row),
      1,
      'LIFETIME',
      '2026-11-27',
    );
    expect(q.current?.daysLeft).toBe(73);
    expect(q.credit).toBe(1000);
    expect(q.amountDue).toBe(13999);
  });

  it('Lifetime -> Yearly is a free downgrade that needs confirmation', async () => {
    const row = {
      id: 7,
      planType: 'LIFETIME',
      amount: '14999.00',
      startDate: '2026-01-01',
      endDate: null,
      status: 'active',
    };
    const q = await quotePlanChange(managerWith(row), 1, 'YEARLY', TODAY);
    expect(q).toMatchObject({
      kind: 'downgrade',
      amountDue: 0,
      requiresPayment: false,
      requiresConfirmation: true,
    });
    expect(q.current?.unusedValue).toBe(14999);
  });

  it('refuses nothing but reports the same plan', async () => {
    const row = {
      id: 8,
      planType: 'MONTHLY',
      amount: '499.00',
      startDate: TODAY,
      endDate: '2026-12-28',
      status: 'ACTIVE',
    };
    const q = await quotePlanChange(managerWith(row), 1, 'MONTHLY', TODAY);
    expect(q).toMatchObject({ kind: 'same', amountDue: 0 });
  });

  it('treats an expired plan as no plan', async () => {
    const row = {
      id: 9,
      planType: 'MONTHLY',
      amount: '499.00',
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      status: 'active',
    };
    const q = await quotePlanChange(managerWith(row), 1, 'MONTHLY', TODAY);
    expect(q).toMatchObject({ kind: 'new', amountDue: 499, current: null });
  });
});
