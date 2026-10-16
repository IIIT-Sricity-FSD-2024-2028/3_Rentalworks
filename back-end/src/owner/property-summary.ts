import { Property } from '../properties/property.entity';

// Room records are authoritative once rooms have been created for a property.
export function ownerPropertySummary(property: Property) {
  const rooms = property.roomEntities || [];
  if (!rooms.length) return property;
  return {
    ...property,
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(room => Number(room.currentOccupancy) > 0).length,
    totalCapacity: rooms.reduce((total, room) => total + Number(room.capacity), 0),
    totalOccupants: rooms.reduce((total, room) => total + Number(room.currentOccupancy), 0),
    estimatedMonthlyRent: rooms.reduce((total, room) => total + Number(room.rent) * Number(room.currentOccupancy), 0),
    hasRoomRecords: true,
    capacityWarning: rooms.some(room => Number(room.currentOccupancy) > Number(room.capacity)),
  };
}
