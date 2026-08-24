import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './src/users/user.entity';
import { Property } from './src/properties/property.entity';
import { Booking } from './src/bookings/booking.entity';
import { Payment } from './src/payments/payment.entity';
import { Complaint } from './src/complaints/complaint.entity';
import { Notification } from './src/notifications/notification.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'rentalworks',
  password: process.env.DB_PASSWORD || 'rentalworks',
  database: process.env.DB_NAME || 'rentalworks_db',
  entities: [User, Property, Booking, Payment, Complaint, Notification],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
