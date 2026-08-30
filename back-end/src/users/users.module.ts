import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserActivity } from './user-activity.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserActivity]), SubscriptionsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
