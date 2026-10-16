import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './booking.entity';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { Room } from '../rooms/room.entity';
import { Property } from '../properties/property.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { WardenNotification } from '../warden-notifications/warden-notification.entity';
import { Notification } from '../notifications/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      User,
      Payment,
      Room,
      Property,
      TenantStay,
      WardenNotification,
      Notification,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
