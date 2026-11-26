<<<<<<< HEAD
// Pure functions that turn backend Property / Room rows into the shapes the
// public discovery pages render. Kept outside components so the listings
// page, details page and booking flow all agree on the same numbers.
=======
import { normalizeStatus, toNumber, normalizeAmenities, amenityLabel, parseList, titleCaseWords, cityFromLocation } from '../../utils/normalize';

// Pure functions that turn backend Property / Room rows into the shapes the
// public pages render. Listings, the details page and the booking flow all
// read from here, so every screen shows the same numbers.
//
// Only data that someone actually entered is shown. In particular:
//  - properties.safetyScore is seed data with no screen to edit it, so it is
//    not shown, and there is no "rating" (the app has no reviews).
//  - rooms.currentOccupancy can be out of sync with real stays (e.g. 11 in a
//    2-bed room), so it is clamped to the room's capacity.
>>>>>>> redux-migration

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

<<<<<<< HEAD
export const isPublicProperty = (p) => !p.status || PUBLIC_STATUSES.includes(String(p.status).toLowerCase());
=======
export const isPublicProperty = (p) => !p.status || PUBLIC_STATUSES.includes(normalizeStatus(p.status));
>>>>>>> redux-migration

export const normaliseGender = (g) => {
  const v = String(g || '').toLowerCase();
  if (['girls', 'female', 'women', 'girls only'].includes(v) || v.includes('girl')) return 'girls';
  if (['boys', 'male', 'men', 'boys only'].includes(v) || v.includes('boy')) return 'boys';
  return 'unisex';
};

<<<<<<< HEAD
=======
export const GENDER_LABEL = { girls: 'Girls only', boys: 'Boys only', unisex: 'Co-living' };

>>>>>>> redux-migration
export const sharingOf = (capacity) => (capacity === 1 ? 'single' : capacity === 3 ? 'triple' : 'double');

export const roomTypeLabel = (capacity) =>
  capacity === 1 ? 'Single Room' : capacity === 3 ? 'Triple Sharing' : capacity === 2 ? 'Double Sharing' : `${capacity} Sharing`;

<<<<<<< HEAD
/** Room entity → bookable room card. Deposit policy: 40% of monthly rent. */
export function mapRoom(r) {
  const capacity = Number(r.capacity) || 1;
  const occupied = Number(r.currentOccupancy) || 0;
  const available = occupied < capacity && r.status !== 'full' && r.status !== 'maintenance';
  const rent = Number(r.rent) || 0;
  const sharing = sharingOf(capacity);
=======
const ROOM_IMAGE = { single: '/room_images/1h.jpg', double: '/room_images/2h.webp', triple: '/room_images/3h.jpg' };

/**
 * Room entity → bookable room card.
 * "Available" uses the same rule as the server's bed allocator
 * (bookings.service allocateRoomAndBed): occupancy below capacity and the
 * room not marked full. A room the server would refuse is never shown as bookable.
 * Deposit policy: 40% of monthly rent (same figure the checkout charges).
 */
export function mapRoom(r) {
  const capacity = Math.max(1, toNumber(r.capacity, 1));
  const status = normalizeStatus(r.status);
  const occupied = Math.min(capacity, Math.max(0, toNumber(r.currentOccupancy)));
  const blocked = status === 'full' || status === 'maintenance';
  const available = !blocked && occupied < capacity;
  const bedsLeft = available ? capacity - occupied : 0;
  const rent = toNumber(r.rent);
  const sharing = sharingOf(capacity);
  const images = parseList(r.images).filter(Boolean);
>>>>>>> redux-migration
  return {
    id: r.id,
    propertyId: r.propertyId ?? r.property?.id ?? null,
    roomNumber: r.roomNumber || '',
    type: roomTypeLabel(capacity),
    sharing,
    rent,
    deposit: Math.round(rent * 0.4),
    capacity,
<<<<<<< HEAD
    currentOccupancy: occupied,
    bedsLeft: Math.max(0, capacity - occupied),
    status: r.status || (available ? 'available' : 'full'),
    available,
    feature: sharing === 'single' ? 'Attached Bathroom & AC' : 'Spacious Room & Attached Washroom',
    image: sharing === 'single' ? '/room_images/1h.jpg' : sharing === 'triple' ? '/room_images/3h.jpg' : '/room_images/2h.webp',
=======
    // Beds counted as taken. When a room is marked full we trust that over the counter.
    currentOccupancy: available ? occupied : capacity,
    bedsLeft,
    status: status || (available ? 'available' : 'full'),
    available,
    underMaintenance: status === 'maintenance',
    image: images[0] || ROOM_IMAGE[sharing],
>>>>>>> redux-migration
  };
}

/** Property (+ its rooms) → listing used by cards, details page and booking flow. */
export function mapProperty(prop, rooms = [], idx = 0) {
  const propRooms = (rooms.length ? rooms : prop.roomEntities || []).map(mapRoom);
<<<<<<< HEAD
  const roomRents = propRooms.map((r) => r.rent).filter((n) => n > 0);
  const lowestRent = roomRents.length ? Math.min(...roomRents) : 0;
  const price = Number(prop.rentMin) || Number(prop.monthlyRent) || lowestRent || 0;
  const amenities = Array.isArray(prop.amenities) ? prop.amenities.map((a) => String(a).toLowerCase()) : [];
  const gender = normaliseGender(prop.gender || (String(prop.name || '').toLowerCase().includes('girls') ? 'girls' : ''));
  const safety = Number(prop.safetyScore) || 0;
  const location = prop.location || [prop.address, prop.city, prop.state].filter(Boolean).join(', ') || 'Location not specified';
  const hasRooms = propRooms.length > 0;
  const hasAvailableRooms = hasRooms && propRooms.some((r) => r.available);
=======
  const hasRooms = propRooms.length > 0;

  const rents = propRooms.map((r) => r.rent).filter((n) => n > 0);
  const availableRents = propRooms.filter((r) => r.available).map((r) => r.rent).filter((n) => n > 0);
  // Price comes from real room rents when rooms exist; the property's own range is only a fallback.
  const price = (availableRents.length ? Math.min(...availableRents) : rents.length ? Math.min(...rents) : 0)
    || toNumber(prop.rentMin) || toNumber(prop.monthlyRent);
  const rentMax = rents.length ? Math.max(...rents) : Math.max(toNumber(prop.rentMax), price);

  const totalBeds = propRooms.reduce((n, r) => n + r.capacity, 0);
  const occupiedBeds = propRooms.reduce((n, r) => n + r.currentOccupancy, 0);
  const freeBeds = propRooms.reduce((n, r) => n + r.bedsLeft, 0);

  // Older rows store 'wifi' / 'meals', newer ones 'WiFi' / 'Mess': reduce both to canonical keys.
  const amenities = normalizeAmenities(prop.amenities);
  // properties.gender is always set; properties.type ('Male' / 'Mixed') is the legacy fallback.
  const gender = normaliseGender(prop.gender || prop.type || (String(prop.name || '').toLowerCase().includes('girls') ? 'girls' : ''));
  const location =
    titleCaseWords(prop.location || [prop.address, prop.city, prop.state].filter(Boolean).join(', ')) || 'Location not specified';
  const images = parseList(prop.images).filter(Boolean);

  // Verified only when an admin has actually ticked both checks.
  const verification = {
    docsVerified: Boolean(prop.docsVerified),
    inspectionPassed: Boolean(prop.inspectionPassed),
    fireSafety: normalizeStatus(prop.fireSafety) === 'yes',
  };
  const verified = verification.docsVerified && verification.inspectionPassed;

  const availability = !hasRooms ? 'no_rooms' : freeBeds > 0 ? 'available' : 'full';
  const availabilityText = !hasRooms
    ? 'Rooms not listed yet'
    : freeBeds > 0
      ? `${freeBeds} bed${freeBeds === 1 ? '' : 's'} available`
      : 'Fully booked';

  const roomTypes = [...new Set(propRooms.map((r) => r.sharing))];
>>>>>>> redux-migration

  return {
    id: prop.id,
    title: prop.name || `PG #${prop.id}`,
    location,
<<<<<<< HEAD
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
=======
    city: titleCaseWords(prop.city) || cityFromLocation(location),
    price,
    rentMax,
    image: images[0] || DEFAULT_IMAGES[(Number(prop.id) || idx) % DEFAULT_IMAGES.length],
    images,
    hasPhotos: images.length > 0,
    gender,
    genderLabel: GENDER_LABEL[gender],
    amenities,
    amenityLabels: amenities.map(amenityLabel),
    roomTypes,
    food: amenities.includes('meals') ? 'food' : 'nofood',
    features: [
      { icon: 'bed', text: [...new Set(propRooms.map((r) => r.type))].join(' / ') || 'Rooms not listed yet' },
      ...(verified ? [{ icon: 'verified', text: 'Verified' }] : []),
    ],
    verification,
    verified,
    about: prop.description || '',
    rules: prop.rules || '',
    owner: prop.owner ? { name: prop.owner.name, email: prop.owner.email, phone: prop.owner.phone } : null,
    rooms: propRooms,
    roomCount: propRooms.length,
    totalBeds,
    occupiedBeds,
    freeBeds,
    hasRooms,
    hasAvailableRooms: freeBeds > 0,
    availability,
    availabilityText,
    isDisabled: freeBeds === 0,
    status: normalizeStatus(prop.status),
>>>>>>> redux-migration
  };
}
