import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleViolation } from './rule-violation.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { Booking } from '../bookings/booking.entity';
import { RuleViolationsService } from './rule-violations.service';
import { RuleViolationsController } from './rule-violations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RuleViolation, User, Notification, Booking])],
  controllers: [RuleViolationsController],
  providers: [RuleViolationsService],
  exports: [RuleViolationsService],
})
export class RuleViolationsModule {}
