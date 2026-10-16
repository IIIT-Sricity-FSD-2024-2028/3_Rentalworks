import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerController } from './owner.controller';
import { ApiController } from './api.controller';
import { OwnerService } from './owner.service';
import { Property } from '../properties/property.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';
import { PropertiesModule } from '../properties/properties.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WardenNotificationsModule } from '../warden-notifications/warden-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      Complaint,
      Notification,
      User,
      Subscription,
    ]),
    PropertiesModule,
    ComplaintsModule,
    NotificationsModule,
    WardenNotificationsModule,
  ],
  controllers: [OwnerController, ApiController],
  providers: [OwnerService],
  exports: [OwnerService],
})
export class OwnerModule {}
