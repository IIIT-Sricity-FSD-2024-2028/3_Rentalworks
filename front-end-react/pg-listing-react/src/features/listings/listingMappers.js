// Pure functions that turn backend Property / Room rows into the shapes the
// public discovery pages render. Kept outside components so the listings
// page, details page and booking flow all agree on the same numbers.

export const DEFAULT_IMAGES = [
  '/room_images/1h.jpg',
  '/room_images/2h.webp',
  '/room_images/3h.jpg',
  '/room_images/4h.webp',
  '/room_images/5h.webp',
  '/room_images/6h.webp',
  '/room_images/7h.webp',
  '/room_images/8h.jpg',
  '/room_images/9h.webp',
];

/** Statuses that make a property visible to the public. */
export const PUBLIC_STATUSES = ['approved', 'verified', 'active'];

export const isPublicProperty = (p) => !p.status || PUBLIC_STATUSES.includes(String(p.status).toLowerCase());

export const normaliseGender = (g) => {
  const v = String(g || '').toLowerCase();
  if (['girls', 'female', 'women', 'girls only'].includes(v) || v.includes('girl')) return 'girls';
  if (['boys', 'male', 'men', 'boys only'].includes(v) || v.includes('boy')) return 'boys';
  return 'unisex';
};

export const sharingOf = (capacity) => (capacity === 1 ? 'single' : capacity === 3 ? 'triple' : 'double');

export const roomTypeLabel = (capacity) =>
  capacity === 1 ? 'Single Room' : capacity === 3 ? 'Triple Sharing' : capacity === 2 ? 'Double Sharing' : `${capacity} Sharing`;

/** Room entity → bookable room card. Deposit policy: 40% of monthly rent. */
export function mapRoom(r) {
  const capacity = Number(r.capacity) || 1;
  const occupied = Number(r.currentOccupancy) || 0;
  const available = occupied < capacity && r.status !== 'full' && r.status !== 'maintenance';
  const rent = Number(r.rent) || 0;
  const sharing = sharingOf(capacity);
  return {
    id: r.id,
    propertyId: r.propertyId ?? r.property?.id ?? null,
    roomNumber: r.roomNumber || '',
    type: roomTypeLabel(capacity),
    sharing,
    rent,
    deposit: Math.round(rent * 0.4),
    capacity,
    currentOccupancy: occupied,
    bedsLeft: Math.max(0, capacity - occupied),
    status: r.status || (available ? 'available' : 'full'),
    available,
    feature: sharing === 'single' ? 'Attached Bathroom & AC' : 'Spacious Room & Attached Washroom',
    image: sharing === 'single' ? '/room_images/1h.jpg' : sharing === 'triple' ? '/room_images/3h.jpg' : '/room_images/2h.webp',
  };
}

/** Property (+ its rooms) → listing used by cards, details page and booking flow. */
export function mapProperty(prop, rooms = [], idx = 0) {
  const propRooms = (rooms.length ? rooms : prop.roomEntities || []).map(mapRoom);
  const roomRents = propRooms.map((r) => r.rent).filter((n) => n > 0);
  const lowestRent = roomRents.length ? Math.min(...roomRents) : 0;
  const price = Number(prop.rentMin) || Number(prop.monthlyRent) || lowestRent || 0;
  const amenities = Array.isArray(prop.amenities) ? prop.amenities.map((a) => String(a).toLowerCase()) : [];
  const gender = normaliseGender(prop.gender || (String(prop.name || '').toLowerCase().includes('girls') ? 'girls' : ''));
  const safety = Number(prop.safetyScore) || 0;
  const location = prop.location || [prop.address, prop.city, prop.state].filter(Boolean).join(', ') || 'Location not specified';
  const hasRooms = propRooms.length > 0;
  const hasAvailableRooms = hasRooms && propRooms.some((r) => r.available);

  return {
    id: prop.id,
    title: prop.name || `PG #${prop.id}`,
    location,
    city: prop.city || '',
    price,
    rentMax: Number(prop.rentMax) || price,
    rating: safety ? Math.min(5, Number((safety / 2).toFixed(1))) : 0,
    safetyScore: safety || null,
    image: (Array.isArray(prop.images) && prop.images[0]) || DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length],
    images: Array.isArray(prop.images) ? prop.images : [],
    gender,
    amenities,
    roomTypes: [...new Set(propRooms.map((r) => r.sharing))],
    food: amenities.some((a) => ['meals', 'food', 'mess'].includes(a)) ? 'food' : 'nofood',
    features: [
      { icon: 'bed', text: [...new Set(propRooms.map((r) => r.type))].join(' / ') || 'Rooms coming soon' },
      ...(safety ? [{ icon: 'verified_user', text: `Safety ${safety}/10` }] : []),
      ...amenities.slice(0, 2).map((a) => ({ icon: 'check_circle', text: a.charAt(0).toUpperCase() + a.slice(1) })),
    ],
    note: prop.compliance === 'Verified' ? 'Verified accommodation • Inspection passed' : 'Listed on RentBro',
    about: prop.description || '',
    rules: prop.rules || '',
    compliance: prop.compliance || '',
    owner: prop.owner ? { name: prop.owner.name, email: prop.owner.email, phone: prop.owner.phone } : null,
    totalRooms: Number(prop.totalRooms) || propRooms.length,
    rooms: propRooms,
    hasRooms,
    hasAvailableRooms,
    isDisabled: !hasAvailableRooms,
    status: prop.status,
  };
}
