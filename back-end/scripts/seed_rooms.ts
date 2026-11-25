import { AppDataSource } from '../data-source';
import { Room } from '../src/rooms/room.entity';
import { Property } from '../src/properties/property.entity';

async function seedRooms() {
  await AppDataSource.initialize();
  console.log('Connected to database.');

  const roomRepo = AppDataSource.getRepository(Room);
  const propRepo = AppDataSource.getRepository(Property);

  const existingRoomsCount = await roomRepo.count();
  if (existingRoomsCount > 0) {
    console.log('Rooms table already has ' + existingRoomsCount + ' rooms. Skipping duplicate seeding.');
    await AppDataSource.destroy();
    return;
  }

  console.log('Seeding rooms for existing properties...');
  const properties = await propRepo.find();

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const totalRooms = p.totalRooms || 10;
    const occupiedRooms = p.occupiedRooms || 0;
    const rent = p.monthlyRent || p.rentMin || 7500;
    const prefix = p.id * 100;

    for (let r = 1; r <= totalRooms; r++) {
      const roomNum = String(prefix + r);
      const isOccupied = r <= occupiedRooms;
      const room = roomRepo.create({
        roomNumber: roomNum,
        propertyId: p.id,
        capacity: 2,
        currentOccupancy: isOccupied ? 2 : 0,
        rent: rent,
        status: isOccupied ? 'full' : 'available',
        maintenanceStatus: 'Ready',
      });
      await roomRepo.save(room);
    }
    console.log('Created ' + totalRooms + ' rooms for Property ' + p.id + ' (' + p.name + ')');
  }

  const finalCount = await roomRepo.count();
  console.log('Total rooms in database now: ' + finalCount);
  await AppDataSource.destroy();
}

seedRooms().catch(err => {
  console.error('Error seeding rooms:', err);
  process.exit(1);
});
