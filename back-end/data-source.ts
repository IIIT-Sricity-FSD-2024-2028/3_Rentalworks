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
import { Issue } from './src/issues/issue.entity';
import { Service } from './src/services/service.entity';
import { ServiceRequest } from './src/service-requests/service-request.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Property,
    Booking,
    Payment,
    Complaint,
    Notification,
    Room,
    BookingRequest,
    TenantStay,
    Issue,
    Service,
    ServiceRequest,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Managed safely via migrations
});
