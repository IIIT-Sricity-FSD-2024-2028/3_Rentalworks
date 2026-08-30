import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserActivity } from './user-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserActivity])],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
