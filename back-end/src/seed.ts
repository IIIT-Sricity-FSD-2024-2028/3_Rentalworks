import { AppDataSource } from '../data-source';
import { User } from './users/user.entity';
import { Property } from './properties/property.entity';
import { Room } from './rooms/room.entity';
import { BookingRequest } from './booking-requests/booking-request.entity';
import { Booking } from './bookings/booking.entity';
import { TenantStay } from './tenant-stays/tenant-stay.entity';
import { Payment } from './payments/payment.entity';
import { Complaint } from './complaints/complaint.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Connected!');

  const userRepo = AppDataSource.getRepository(User);
  const propertyRepo = AppDataSource.getRepository(Property);
  const roomRepo = AppDataSource.getRepository(Room);
  const bookingReqRepo = AppDataSource.getRepository(BookingRequest);
  const bookingRepo = AppDataSource.getRepository(Booking);
  const stayRepo = AppDataSource.getRepository(TenantStay);
  const paymentRepo = AppDataSource.getRepository(Payment);
  const complaintRepo = AppDataSource.getRepository(Complaint);

  // Check if seeded
  const adminCount = await userRepo.count({ where: { role: 'admin' } });
  if (adminCount > 0) {
    console.log('Database already seeded. Skipping...');
    await AppDataSource.destroy();
    return;
  }

  console.log('Seeding Users...');
  const password = await bcrypt.hash('password123', 10);

  // USERS
  const tenant1 = userRepo.create({
    id: 1, // Force ID 1
    name: 'Arun Kumar',
    email: 'tenant1@example.com',
    phone: '+91 98765 00001',
    role: 'tenant',
    username: 'tenant1',
    password,
  });
  
  const tenant2 = userRepo.create({
    name: 'Suresh Raina',
    email: 'tenant2@example.com',
    phone: '+91 98765 00002',
    role: 'tenant',
    username: 'tenant2',
    password,
  });
  
  const tenant3 = userRepo.create({
    name: 'Priya Sharma',
    email: 'tenant3@example.com',
    phone: '+91 98765 00003',
    role: 'tenant',
    username: 'tenant3',
    password,
  });

  const owner1 = userRepo.create({
    name: 'PG Owner One',
    email: 'owner1@example.com',
    phone: '+91 98765 00004',
    role: 'owner',
    username: 'owner1',
    password,
  });

  const owner2 = userRepo.create({
    name: 'PG Owner Two',
    email: 'owner2@example.com',
    phone: '+91 98765 00005',
    role: 'owner',
    username: 'owner2',
    password,
  });

  const admin = userRepo.create({
    name: 'System Admin',
    email: 'admin@example.com',
    phone: '+91 98765 00006',
    role: 'admin',
    username: 'admin',
    password,
  });

  await userRepo.save([tenant1, tenant2, tenant3, owner1, owner2, admin]);

  console.log('Seeding Properties...');
  const prop1 = propertyRepo.create({
    name: 'Green Nest PG',
    location: 'Chennai',
    ownerId: owner1.id,
    rentMin: 6000,
    rentMax: 10000,
    safetyScore: 9.5,
    rooms: '1/2/3',
    occupancy: 20,
    amenities: ['WiFi', 'Food', 'AC'],
    status: 'approved',
    compliance: 'Verified',
    fireSafety: 'Yes'
  });

  const prop2 = propertyRepo.create({
    name: 'Urban Living',
    location: 'Bangalore',
    ownerId: owner2.id,
    rentMin: 7000,
    rentMax: 12000,
    safetyScore: 8.8,
    rooms: '1/2',
    occupancy: 15,
    amenities: ['WiFi', 'Gym', 'Washing Machine'],
    status: 'approved',
    compliance: 'Verified',
    fireSafety: 'Yes'
  });

  const prop3 = propertyRepo.create({
    name: 'Cozy Stay',
    location: 'Hyderabad',
    ownerId: owner1.id,
    rentMin: 5000,
    rentMax: 8000,
    safetyScore: 7.5,
    rooms: '2/3/4',
    occupancy: 5,
    amenities: ['WiFi'],
    status: 'pending',
    compliance: 'Pending',
    fireSafety: 'No'
  });

  await propertyRepo.save([prop1, prop2, prop3]);

  console.log('Seeding Rooms...');
  const room1 = roomRepo.create({
    roomNumber: '101',
    propertyId: prop1.id,
    capacity: 2,
    currentOccupancy: 1,
    rent: 8000,
    status: 'available'
  });

  const room2 = roomRepo.create({
    roomNumber: '102',
    propertyId: prop1.id,
    capacity: 1,
    currentOccupancy: 1,
    rent: 10000,
    status: 'full'
  });

  const room3 = roomRepo.create({
    roomNumber: '201',
    propertyId: prop2.id,
    capacity: 2,
    currentOccupancy: 0,
    rent: 9000,
    status: 'available'
  });

  const room4 = roomRepo.create({
    roomNumber: '202',
    propertyId: prop2.id,
    capacity: 3,
    currentOccupancy: 3,
    rent: 7000,
    status: 'full'
  });

  await roomRepo.save([room1, room2, room3, room4]);

  console.log('Seeding Booking Requests...');
  const br1 = bookingReqRepo.create({
    tenantId: tenant2.id,
    propertyId: prop1.id,
    roomId: room1.id,
    status: 'pending',
    requestedDate: '2026-03-01',
    message: 'Interested in room 101'
  });

  const br2 = bookingReqRepo.create({
    tenantId: tenant3.id,
    propertyId: prop2.id,
    roomId: room3.id,
    status: 'approved',
    requestedDate: '2026-02-15',
    message: 'Looking for a quiet place'
  });

  await bookingReqRepo.save([br1, br2]);

  console.log('Seeding Bookings...');
  const booking1 = bookingRepo.create({
    tenantId: tenant1.id, // For tenant ID 1
    propertyId: prop1.id,
    roomId: room2.id,
    room: room2.roomNumber,
    checkIn: '2025-10-01',
    duration: '12 months',
    rent: 10000,
    status: 'active'
  });

  const booking2 = bookingRepo.create({
    tenantId: tenant3.id,
    propertyId: prop2.id,
    roomId: room4.id,
    room: room4.roomNumber,
    checkIn: '2026-01-01',
    duration: '6 months',
    rent: 7000,
    status: 'active'
  });

  await bookingRepo.save([booking1, booking2]);

  console.log('Seeding Tenant Stays...');
  const stay1 = stayRepo.create({
    tenantId: tenant1.id,
    propertyId: prop1.id,
    roomId: room2.id,
    moveInDate: '2025-10-01',
    status: 'active'
  });

  const stay2 = stayRepo.create({
    tenantId: tenant3.id,
    propertyId: prop2.id,
    roomId: room4.id,
    moveInDate: '2026-01-01',
    status: 'active'
  });

  await stayRepo.save([stay1, stay2]);

  console.log('Seeding Payments...');
  const pay1 = paymentRepo.create({
    tenantId: tenant1.id,
    propertyId: prop1.id,
    room: room2.roomNumber,
    amount: 10000,
    method: 'UPI',
    transactionId: 'UPI-123456789',
    paidDate: '2026-03-01',
    status: 'verified',
    clearance: 'Approved'
  });

  const pay2 = paymentRepo.create({
    tenantId: tenant1.id,
    propertyId: prop1.id,
    room: room2.roomNumber,
    amount: 10000,
    method: 'Bank Transfer',
    transactionId: 'NEFT-987654321',
    paidDate: '2026-02-01',
    status: 'verified',
    clearance: 'Approved'
  });

  const pay3 = paymentRepo.create({
    tenantId: tenant3.id,
    propertyId: prop2.id,
    room: room4.roomNumber,
    amount: 7000,
    method: 'Credit Card',
    transactionId: 'CC-11223344',
    paidDate: '2026-03-05',
    status: 'pending',
    clearance: 'Pending'
  });

  await paymentRepo.save([pay1, pay2, pay3]);

  console.log('Seeding Complaints...');
  const comp1 = complaintRepo.create({
    tenantId: tenant1.id, // For tenant ID 1
    propertyId: prop1.id,
    title: 'AC not cooling',
    priority: 'high',
    description: 'The AC in room 102 is blowing warm air.',
    status: 'open',
    reportedAt: '2026-03-10'
  });

  const comp2 = complaintRepo.create({
    tenantId: tenant1.id,
    propertyId: prop1.id,
    title: 'Leaky faucet',
    priority: 'low',
    description: 'Bathroom tap is dripping.',
    status: 'resolved',
    reportedAt: '2026-02-15',
    resolvedAt: '2026-02-16'
  });

  const comp3 = complaintRepo.create({
    tenantId: tenant3.id,
    propertyId: prop2.id,
    title: 'Wi-Fi slow',
    priority: 'medium',
    description: 'Internet connection is very slow since yesterday.',
    status: 'in_progress',
    reportedAt: '2026-03-11'
  });

  await complaintRepo.save([comp1, comp2, comp3]);

  console.log('Seed completed successfully!');
  await AppDataSource.destroy();
}

seed().catch(err => {
  console.error('Seed failed!', err);
  process.exit(1);
});
