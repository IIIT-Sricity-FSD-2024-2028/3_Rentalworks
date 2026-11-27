import { createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { createRepositorySlice, pick } from './createRepositorySlice';

const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

/** Room sizes an owner prices separately. `capacity` = beds in the room. */
export const SHARING_TYPES = [
  { key: 'single', capacity: 1, label: 'Single room', short: 'Single' },
  { key: 'double', capacity: 2, label: 'Double sharing', short: 'Double' },
  { key: 'triple', capacity: 3, label: 'Triple sharing', short: 'Triple' },
];
export const sharingKeyForCapacity = (capacity) => SHARING_TYPES.find((s) => s.capacity === Number(capacity))?.key || null;

/** Property type decides who may book: Male → boys, Female → girls, Mixed → everyone. */
export const genderFromType = (type) => (type === 'Male' ? 'boys' : type === 'Female' ? 'girls' : 'unisex');

/** { single, double, triple } with empty / zero values as null. */
export function cleanSharingRents(r = {}) {
  return Object.fromEntries(SHARING_TYPES.map(({ key }) => [key, Number(r?.[key]) > 0 ? Math.round(Number(r[key])) : null]));
}

/** Body an owner sends from the Add / Edit property forms. */
export function ownerPropertyBody(p) {
  const sharingRents = cleanSharingRents(p.sharingRents);
  const offered = Object.values(sharingRents).filter(Boolean);
  const low = offered.length ? Math.min(...offered) : 0;
  const high = offered.length ? Math.max(...offered) : 0;
  return {
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    location: `${p.city}, ${p.state}`,
    type: p.type,
    gender: genderFromType(p.type),
    totalCapacity: num(p.totalCapacity),
    totalRooms: num(p.totalRooms),
    occupiedRooms: num(p.occupiedRooms) || 0,
    // The server recomputes these from sharingRents; sent because the create DTO requires them.
    sharingRents,
    monthlyRent: low,
    rentMin: low,
    rentMax: high,
    rooms: `${num(p.occupiedRooms) || 0}/${p.totalRooms}`,
    amenities: p.amenities,
    description: p.description,
    // Stored paths ("uploads/properties/…" or https URLs), never display URLs.
    images: p.rawImages || p.images || [],
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

/** Upload one photo for a property (workflow action on top of the 4 CRUD thunks). */
export const uploadPropertyPhoto = createAsyncThunk('properties/uploadPhoto', async ({ propertyId, file }, { rejectWithValue }) => {
  try {
    const form = new FormData();
    form.append('file', file);
    return await http.post(`/properties/${propertyId}/upload-image`, form);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

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
