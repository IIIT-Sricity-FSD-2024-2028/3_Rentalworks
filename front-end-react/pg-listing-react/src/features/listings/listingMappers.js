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

/**
 * One rule for every image on every screen:
 *  - full URLs (https://…) are used as they are;
 *  - files uploaded to the backend ("uploads/properties/x.jpg") are served by the API;
 *  - anything else starting with "/" is a frontend asset (e.g. /room_images/1h.jpg).
 */
export function resolveImageUrl(src) {
  if (!src) return '';
  const value = String(src).trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (/^\/?uploads\//i.test(value)) {
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${api}/${value.replace(/^\//, '')}`;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

/** Statuses that make a property visible to the public. */
export const PUBLIC_STATUSES = ['approved', 'verified', 'active'];

export const isPublicProperty = (p) => !p.status || PUBLIC_STATUSES.includes(normalizeStatus(p.status));

export const normaliseGender = (g) => {
  const v = String(g || '').toLowerCase();
  if (['girls', 'female', 'women', 'girls only'].includes(v) || v.includes('girl')) return 'girls';
  if (['boys', 'male', 'men', 'boys only'].includes(v) || v.includes('boy')) return 'boys';
  return 'unisex';
};

export const GENDER_LABEL = { girls: 'Girls only', boys: 'Boys only', unisex: 'Co-living' };

export const sharingOf = (capacity) => (capacity === 1 ? 'single' : capacity === 3 ? 'triple' : 'double');

export const roomTypeLabel = (capacity) =>
  capacity === 1 ? 'Single Room' : capacity === 3 ? 'Triple Sharing' : capacity === 2 ? 'Double Sharing' : `${capacity} Sharing`;

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
  const images = parseList(r.images).filter(Boolean).map(resolveImageUrl);
  return {
    id: r.id,
    propertyId: r.propertyId ?? r.property?.id ?? null,
    roomNumber: r.roomNumber || '',
    type: roomTypeLabel(capacity),
    sharing,
    rent,
    deposit: Math.round(rent * 0.4),
    capacity,
    // Beds counted as taken. When a room is marked full we trust that over the counter.
    currentOccupancy: available ? occupied : capacity,
    bedsLeft,
    status: status || (available ? 'available' : 'full'),
    available,
    underMaintenance: status === 'maintenance',
    image: images[0] || ROOM_IMAGE[sharing],
  };
}

/** Property (+ its rooms) → listing used by cards, details page and booking flow. */
export function mapProperty(prop, rooms = [], idx = 0) {
  const propRooms = (rooms.length ? rooms : prop.roomEntities || []).map(mapRoom);
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
  const images = parseList(prop.images).filter(Boolean).map(resolveImageUrl);

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

  return {
    id: prop.id,
    title: prop.name || `PG #${prop.id}`,
    location,
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
    // The owner's tenant-facing policy (see back-end properties/house-rules.ts).
    houseRules: prop.houseRules || null,
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
  };
}
