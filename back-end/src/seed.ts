import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { User } from './users/user.entity';
import { Property } from './properties/property.entity';
import { Booking } from './bookings/booking.entity';
import { Payment } from './payments/payment.entity';
import { Complaint } from './complaints/complaint.entity';
import { Notification } from './notifications/notification.entity';

async function bootstrap() {
  console.log('Starting seed script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get<DataSource>(getDataSourceToken());

  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`data.json not found at ${dataPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // 1. Users
  const userRepository = dataSource.getRepository(User);
  for (const u of data.USERS) {
    let user = await userRepository.findOneBy({ email: u.email });
    if (!user) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const newUser = userRepository.create({
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        joinDate: u.joinDate,
        username: u.username,
        password: hashedPassword,
      });
      await userRepository.save(newUser);
      console.log(`User seeded: ${u.email}`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  // 2. Properties
  const propertyRepository = dataSource.getRepository(Property);
  for (const p of data.PROPERTIES) {
    let property = await propertyRepository.findOneBy({ name: p.name });
    if (!property) {
      const owner = await userRepository.findOneBy({ name: p.owner });
      const ownerId = owner ? owner.id : undefined;
      const newProperty = propertyRepository.create({
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
        changeRequestPending: p.changeRequestPending,
      });
      await propertyRepository.save(newProperty);
      console.log(`Property seeded: ${p.name}`);
    } else {
      console.log(`Property already exists: ${p.name}`);
    }
  }

  // 3. Bookings
  const bookingRepository = dataSource.getRepository(Booking);
  for (const b of data.BOOKINGS) {
    const tenant = await userRepository.findOneBy({ name: b.tenant });
    const property = await propertyRepository.findOneBy({ name: b.property });
    if (tenant && property) {
      let booking = await bookingRepository.findOneBy({ tenantId: tenant.id, propertyId: property.id, room: b.room });
      if (!booking) {
        const newBooking = bookingRepository.create({
          tenantId: tenant.id,
          propertyId: property.id,
          room: b.room,
          checkIn: b.checkIn,
          duration: b.duration,
          rent: b.rent,
          status: b.status,
        });
        await bookingRepository.save(newBooking);
        console.log(`Booking seeded for: ${tenant.name}`);
      } else {
        console.log(`Booking already exists for: ${tenant.name}`);
      }
    }
  }

  // 4. Payments
  const paymentRepository = dataSource.getRepository(Payment);
  for (const pay of data.PAYMENTS) {
    const tenant = await userRepository.findOneBy({ name: pay.tenant });
    const property = await propertyRepository.findOneBy({ name: pay.property });
    if (tenant && property) {
      let payment = await paymentRepository.findOneBy({ transactionId: pay.transactionId });
      if (!payment) {
        const newPayment = paymentRepository.create({
          tenantId: tenant.id,
          propertyId: property.id,
          room: pay.room,
          amount: pay.amount,
          method: pay.method,
          transactionId: pay.transactionId,
          paidDate: pay.paidDate,
          status: pay.status,
          clearance: pay.clearance,
        });
        await paymentRepository.save(newPayment);
        console.log(`Payment seeded: ${pay.transactionId}`);
      } else {
        console.log(`Payment already exists: ${pay.transactionId}`);
      }
    }
  }

  // 5. Complaints
  const complaintRepository = dataSource.getRepository(Complaint);
  for (const c of data.COMPLAINTS) {
    const tenant = await userRepository.findOneBy({ name: c.tenant });
    const property = await propertyRepository.findOneBy({ name: c.property });
    if (tenant && property) {
      let complaint = await complaintRepository.findOneBy({ description: c.description, tenantId: tenant.id });
      if (!complaint) {
        const newComplaint = complaintRepository.create({
          tenantId: tenant.id,
          propertyId: property.id,
          description: c.description,
          status: c.status,
          reportedAt: c.reportedAt,
        });
        await complaintRepository.save(newComplaint);
        console.log(`Complaint seeded for: ${tenant.name}`);
      } else {
        console.log(`Complaint already exists for: ${tenant.name}`);
      }
    }
  }

  // 6. Notifications
  const notificationRepository = dataSource.getRepository(Notification);
  for (const n of data.NOTIFICATIONS) {
    const byUser = await userRepository.findOneBy({ name: n.by });
    if (byUser) {
      let notif = await notificationRepository.findOneBy({ title: n.title, sentAt: n.sentAt });
      if (!notif) {
        const newNotif = notificationRepository.create({
          title: n.title,
          message: n.message,
          type: n.type,
          priority: n.priority,
          recipients: n.recipients,
          sentAt: n.sentAt,
          byUserId: byUser.id,
        });
        await notificationRepository.save(newNotif);
        console.log(`Notification seeded: ${n.title}`);
      } else {
        console.log(`Notification already exists: ${n.title}`);
      }
    }
  }

  console.log('Seeding complete.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
