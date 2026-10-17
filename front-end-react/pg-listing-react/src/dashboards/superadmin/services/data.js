export const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export function ownerFor(property) {
  const owner = property.owner || null;
  return {
    key: owner ? owner.id : `property-${property.id}`,
    email: owner ? owner.email : 'Unknown',
    plan: owner && owner.subscriptionPlan ? owner.subscriptionPlan : 'Not assigned',
    fee: owner ? Number(owner.subscriptionFee || 0) : 0,
  };
}
