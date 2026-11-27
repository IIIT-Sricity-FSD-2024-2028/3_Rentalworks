import type { EntityManager } from 'typeorm';
import type { RentDue } from './rent-due.entity';
import { chargeTotal, serviceBillingForDues } from './service-billing';

function due(id: number, propertyId: number, status: RentDue['status'], periodStart: string, periodEnd: string) {
  return { id, propertyId, status, periodStart, periodEnd } as RentDue;
}

describe('service usage billing', () => {
  it('uses the earliest eligible unpaid bill at the same property and keeps paid charges on their receipt', async () => {
    const requests = [
      { id: 1, propertyId: 5, billableFrom: '2026-11-20', amount: '100.00', quantity: '2', serviceName: 'Laundry' },
      { id: 2, propertyId: 5, billableFrom: '2026-11-20', amount: '150.00', quantity: '1', serviceName: 'Room Cleaning', rentDueId: 15 },
      { id: 3, propertyId: 6, billableFrom: '2026-11-25', amount: '25.50', quantity: '1', serviceName: 'Parking' },
    ];
    const find = jest.fn().mockResolvedValue(requests);
    const manager = { getRepository: () => ({ find }) } as unknown as EntityManager;
    const result = await serviceBillingForDues(manager, 7, [
      due(9, 5, 'overdue', '2026-10-01', '2026-10-31'),
      due(15, 5, 'paid', '2026-11-01', '2026-11-30'),
      due(17, 5, 'upcoming', '2027-01-01', '2027-01-31'),
      due(16, 5, 'upcoming', '2026-12-01', '2026-12-31'),
    ]);
    expect(result.byDueId.get(15)?.map((charge) => charge.id)).toEqual([2]);
    expect(result.byDueId.get(16)?.map((charge) => charge.id)).toEqual([1]);
    expect(result.byDueId.has(9)).toBe(false);
    expect(result.byDueId.has(17)).toBe(false);
    expect(result.pendingCharges.map((charge) => charge.id)).toEqual([3]);
    expect(chargeTotal(result.pendingCharges)).toBe(25.5);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 7, status: 'completed' }),
    }));
  });
});
