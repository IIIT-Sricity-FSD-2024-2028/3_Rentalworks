export function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function mergeById(serverItems, localItems) {
  const merged = [...serverItems];
  localItems.forEach(item => {
    if (!merged.some(existing => (item.id && existing.id === item.id) || (item.email && existing.email === item.email))) merged.push(item);
  });
  return merged;
}

export const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export function ownerFor(property, users, registeredOwners) {
  const ownerName = property.owner?.name || property.owner;
  const ownerEmail = property.owner?.email || property.ownerEmail;
  const owner = [...registeredOwners, ...users].find(person =>
    (ownerEmail && person.email === ownerEmail) || (ownerName && person.name === ownerName)
  ) || (typeof property.owner === 'object' ? property.owner : null);
  const key = owner?.email || owner?.id || ownerEmail || ownerName || property.id;
  const plan = owner?.subscriptionPlan && owner.subscriptionPlan !== 'Pending Approval'
    ? owner.subscriptionPlan
    : ['verified', 'approved'].includes(property.status) ? 'Standard (Legacy)' : 'Pending Approval';
  const revenue = plan === 'Standard (Legacy)' ? 5000 : Number(owner?.subscriptionFee || 0);
  return { key, plan, revenue, email: ownerEmail || 'Unknown' };
}
