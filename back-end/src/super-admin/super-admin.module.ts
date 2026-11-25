import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Notification } from '../notifications/notification.entity';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Property, Payment, Booking, TenantStay, Notification])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
