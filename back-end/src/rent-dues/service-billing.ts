import { EntityManager, IsNull, Not } from 'typeorm';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { RentDue } from './rent-due.entity';

export type ServiceCharge = ReturnType<typeof toCharge>;

const toCharge = (request: ServiceRequest) => ({
  id: request.id,
  serviceName: request.serviceName,
  quantity: Number(request.quantity),
  pricingModel: request.pricingModel,
  amount: Number(request.amount),
  usedOn: request.billableFrom,
});

export const toCents = (amount: number) => Math.round(Number(amount) * 100);
export const chargeTotal = (charges: ServiceCharge[]) =>
  charges.reduce((total, charge) => total + toCents(charge.amount), 0) / 100;

// Finalizing a service and settling a bill share the same tenant transaction lock.
export async function lockTenantBilling(manager: EntityManager, tenantId: number) {
  await manager.query('SELECT pg_advisory_xact_lock(195000, $1::int)', [tenantId]);
}

export async function serviceBillingForDues(manager: EntityManager, tenantId: number, dues: RentDue[]) {
  const requests = await manager.getRepository(ServiceRequest).find({
    where: { tenantId, billableFrom: Not(IsNull()), status: 'completed' },
    order: { billableFrom: 'ASC', id: 'ASC' },
  });
  const openDues = dues.filter((due) => ['upcoming', 'due_soon', 'overdue'].includes(due.status))
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const byDueId = new Map<number, ServiceCharge[]>();
  const pendingCharges: ServiceCharge[] = [];
  for (const request of requests) {
    const dueId = request.rentDueId ?? openDues.find((due) =>
      due.propertyId === request.propertyId && due.periodEnd >= request.billableFrom!,
    )?.id;
    const charge = toCharge(request);
    if (dueId == null) {
      pendingCharges.push(charge);
    } else {
      const items = byDueId.get(dueId) ?? [];
      items.push(charge);
      byDueId.set(dueId, items);
    }
  }
  return { byDueId, pendingCharges };
}

/** What a tenant owes on one due: the rent plus the completed service usage billed to it. */
export async function billedAmountForDue(manager: EntityManager, due: RentDue) {
  const dues = await manager.getRepository(RentDue).findBy({ tenantId: due.tenantId });
  const { byDueId } = await serviceBillingForDues(manager, due.tenantId, dues);
  return (toCents(due.amount) + toCents(chargeTotal(byDueId.get(due.id) ?? []))) / 100;
}
