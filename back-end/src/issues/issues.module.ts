import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './issue.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';
import { WardenNotificationsModule } from '../warden-notifications/warden-notifications.module';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, Notification, User, Property, Room]),
    WardenNotificationsModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
