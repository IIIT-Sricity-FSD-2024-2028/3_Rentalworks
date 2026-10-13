import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './src/users/user.entity';
import { Property } from './src/properties/property.entity';
import { Booking } from './src/bookings/booking.entity';
import { Payment } from './src/payments/payment.entity';
import { Complaint } from './src/complaints/complaint.entity';
import { Notification } from './src/notifications/notification.entity';
import { Room } from './src/rooms/room.entity';
import { BookingRequest } from './src/booking-requests/booking-request.entity';
import { TenantStay } from './src/tenant-stays/tenant-stay.entity';
import { SuperAdminAnnouncements1800000000000 } from './src/migrations/1800000000000-SuperAdminAnnouncements';
import { RestoreSharedColumns1800000001000 } from './src/migrations/1800000001000-RestoreSharedColumns';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Property, Booking, Payment, Complaint, Notification, Room, BookingRequest, TenantStay],
  migrations: [SuperAdminAnnouncements1800000000000, RestoreSharedColumns1800000001000],
  synchronize: false,
});
