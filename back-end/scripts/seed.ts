import { AppDataSource } from '../data-source';
import * as bcrypt from 'bcrypt';
import { User } from '../src/users/user.entity';
import { Property } from '../src/properties/property.entity';
import { Booking } from '../src/bookings/booking.entity';
import { Payment } from '../src/payments/payment.entity';
import { Complaint } from '../src/complaints/complaint.entity';
import { Notification } from '../src/notifications/notification.entity';
import { USERS, PROPERTIES, BOOKINGS, PAYMENTS, COMPLAINTS, NOTIFICATIONS } from '../src/data';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected.');

  const data = { USERS, PROPERTIES, BOOKINGS, PAYMENTS, COMPLAINTS, NOTIFICATIONS };

  const userRepository = AppDataSource.getRepository(User);
  const propertyRepository = AppDataSource.getRepository(Property);
  const bookingRepository = AppDataSource.getRepository(Booking);
  const paymentRepository = AppDataSource.getRepository(Payment);
  const complaintRepository = AppDataSource.getRepository(Complaint);
  const notificationRepository = AppDataSource.getRepository(Notification);

  console.log('Clearing existing data...');
  await paymentRepository.clear();
  await notificationRepository.clear();
  await complaintRepository.clear();
  await bookingRepository.clear();
  await propertyRepository.clear();
  await userRepository.clear();

  // Maps to store name-to-id mapping
  const userNameToId = new Map<string, number>();
  const propertyNameToId = new Map<string, number>();

  console.log('Seeding Users...');
  for (const u of data.USERS) {
    const hashedPassword = await bcrypt.hash(u.password || 'default123', 10);
    const user = userRepository.create({
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      username: u.username,
      password: hashedPassword,
      status: u.status,
      joinDate: u.joinDate
    });
    
    // We will update assignedPropertyId in a second pass since properties are seeded after users,
    // OR we can change the seeding order. Let's do a second pass for user properties.
    const saved = await userRepository.save(user);
    userNameToId.set(saved.name, saved.id);
  }

  console.log('Seeding Properties...');
  for (const p of data.PROPERTIES) {
    const ownerId = userNameToId.get(p.owner);
    if (!ownerId) {
      console.warn(`Owner ${p.owner} not found for property ${p.name}`);
      continue;
    }
    const property = propertyRepository.create({
      name: p.name,
      location: p.location,
      ownerId: ownerId,
      rentMin: p.rentMin,
      rentMax: p.rentMax,
      safetyScore: p.safetyScore,
      rooms: p.rooms,
      occupancy: p.occupancy,
      amenities: p.amenities,
      status: p.status,
      docsVerified: p.docsVerified,
      inspectionPassed: p.inspectionPassed,
      commissionRate: p.commissionRate,
      compliance: p.compliance,
      fireSafety: p.fireSafety,
      changeRequestPending: p.changeRequestPending
    });
    const saved = await propertyRepository.save(property);
    propertyNameToId.set(saved.name, saved.id);
  }

  console.log('Linking Users to Properties (Second Pass)...');
  for (const u of data.USERS) {
    if (u.property) {
      const propertyId = propertyNameToId.get(u.property);
      const userId = userNameToId.get(u.name);
      if (propertyId && userId) {
        await userRepository.update(userId, { assignedPropertyId: propertyId });
      }
    }
  }

  console.log('Seeding Bookings...');
  for (const b of data.BOOKINGS) {
    const tenantId = userNameToId.get(b.tenant);
    const propertyId = propertyNameToId.get(b.property);
    if (!tenantId || !propertyId) continue;

    const booking = bookingRepository.create({
      tenantId,
      propertyId,
      room: b.room,
      checkIn: b.checkIn,
      duration: b.duration,
      rent: b.rent,
      status: b.status
    });
    await bookingRepository.save(booking);
  }

  console.log('Seeding Payments...');
  for (const p of data.PAYMENTS) {
    const tenantId = userNameToId.get(p.tenant);
    const propertyId = propertyNameToId.get(p.property);
    if (!tenantId || !propertyId) continue;

    const payment = paymentRepository.create({
      tenantId,
      propertyId,
      room: p.room,
      amount: p.amount,
      method: p.method,
      transactionId: p.transactionId,
      paidDate: p.paidDate,
      status: p.status,
      clearance: p.clearance
    });
    await paymentRepository.save(payment);
  }

  console.log('Seeding Complaints...');
  for (const c of data.COMPLAINTS) {
    const tenantId = userNameToId.get(c.tenant);
    const propertyId = propertyNameToId.get(c.property);
    if (!tenantId || !propertyId) continue;

    const complaint = complaintRepository.create({
      tenantId,
      propertyId,
      description: c.description,
      status: c.status,
      reportedAt: c.reportedAt
    });
    await complaintRepository.save(complaint);
  }

  console.log('Seeding Notifications...');
  for (const n of data.NOTIFICATIONS) {
    const byUserId = userNameToId.get(n.by);
    if (!byUserId) continue;

    const notification = notificationRepository.create({
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      recipients: n.recipients,
      sentAt: n.sentAt,
      byUserId: byUserId
    });
    await notificationRepository.save(notification);
  }

  console.log('Seeding completed successfully!');
  await AppDataSource.destroy();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
