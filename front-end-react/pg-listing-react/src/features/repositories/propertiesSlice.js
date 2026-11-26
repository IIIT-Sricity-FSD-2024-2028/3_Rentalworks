import { createRepositorySlice, pick } from './createRepositorySlice';

const num = (v) => (v === undefined || v === '' ? undefined : Number(v));

/** Body an owner sends from the Add / Edit property forms. */
export function ownerPropertyBody(p) {
  return {
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    location: `${p.city}, ${p.state}`,
    type: p.type,
    gender: p.gender,
    totalCapacity: num(p.totalCapacity),
    totalRooms: num(p.totalRooms),
    occupiedRooms: num(p.occupiedRooms) || 0,
    monthlyRent: num(p.monthlyRent),
    rentMin: num(p.monthlyRent),
    rentMax: num(p.monthlyRent),
    rooms: `${num(p.occupiedRooms) || 0}/${p.totalRooms}`,
    amenities: p.amenities,
    description: p.description,
    images: p.images || [],
  };
}

function adminPropertyBody(p) {
  const body = pick(p, ['status', 'name', 'location', 'rooms', 'gender', 'description']);
  // docsVerified is derived on the server from approved documents.
  if (p.inspectionPassed !== undefined) body.inspectionPassed = Boolean(p.inspectionPassed);
  ['ownerId', 'rentMin', 'rentMax'].forEach((k) => {
    if (p[k] !== undefined) body[k] = Number(p[k]);
  });
  if (p.rooms !== undefined) body.rooms = String(p.rooms);
  return body;
}

// Repository: properties (PG listings). Every role lists /properties: the
// server returns approved ones, plus an owner's own pending ones (admins: all).
// Owners write through the owner-scoped /api controller.
export const propertiesRepo = createRepositorySlice({
  name: 'properties',
  base: '/properties',
  roleBase: { owner: '/api/properties' },
  listPath: { owner: '/properties' },
  toCreate: (p, role) =>
    role === 'owner'
      ? ownerPropertyBody(p)
      : {
          name: p.name,
          location: p.location,
          ownerId: Number(p.ownerId),
          rentMin: Number(p.rentMin) || 0,
          rentMax: Number(p.rentMax) || Number(p.rentMin) || 0,
          rooms: p.rooms || '0/0',
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          ...pick(p, ['gender']),
        },
  toUpdate: (p, role) => (role === 'owner' ? ownerPropertyBody(p) : adminPropertyBody(p)),
});
