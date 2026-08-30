import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './src/users/user.entity';
import { Property } from './src/properties/property.entity';
import { Booking } from './src/bookings/booking.entity';
import { Payment } from './src/payments/payment.entity';
import { Complaint } from './src/complaints/complaint.entity';
import { Notification } from './src/notifications/notification.entity';
import { SubscriptionPlan } from './src/subscriptions/subscription-plan.entity';
import { Subscription } from './src/subscriptions/subscription.entity';
import { SubscriptionPayment } from './src/subscriptions/subscription-payment.entity';

config();

export const AppDataSource = new DataSource({
  type: 'better-sqlite3' as any,
  database: process.env.DB_NAME || 'rentalworks.sqlite',
  entities: [User, Property, Booking, Payment, Complaint, Notification, SubscriptionPlan, Subscription, SubscriptionPayment],
  migrations: ['src/migrations/*.ts'],
  synchronize: true,
});
