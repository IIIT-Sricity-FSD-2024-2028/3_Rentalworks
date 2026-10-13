import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WardenNotification } from './warden-notification.entity';
import { WardenNotificationsService } from './warden-notifications.service';
import { WardenNotificationsController } from './warden-notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WardenNotification])],
  controllers: [WardenNotificationsController],
  providers: [WardenNotificationsService],
  exports: [WardenNotificationsService],
})
export class WardenNotificationsModule {}
