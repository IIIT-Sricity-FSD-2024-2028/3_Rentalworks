import { createRepositorySlice, pick } from './createRepositorySlice';

const ROOM_FIELDS = ['roomNumber', 'propertyId', 'capacity', 'rent', 'status', 'maintenanceStatus'];

/** Only the fields the room DTO accepts, with numbers as numbers. */
function roomBody(r, role) {
  const body = pick(r, role === 'owner' ? ROOM_FIELDS : [...ROOM_FIELDS, 'currentOccupancy']);
  ['propertyId', 'capacity', 'rent', 'currentOccupancy'].forEach((k) => {
    if (body[k] !== undefined) body[k] = Number(body[k]);
  });
  if (body.roomNumber !== undefined) body.roomNumber = String(body.roomNumber).trim();
  return body;
}

// Repository: rooms (beds, rent, occupancy per property). The room catalogue
// is public; owners filter it to their own properties and never set
// occupancy (bookings do).
export const roomsRepo = createRepositorySlice({
  name: 'rooms',
  base: '/rooms',
  updateMethod: 'put',
  toCreate: roomBody,
  toUpdate: roomBody,
});
