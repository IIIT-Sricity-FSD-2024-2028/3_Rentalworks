import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Property])],
  controllers: [NotificationsController],
  providers: [NotificationsService]
})
export class NotificationsModule {}
