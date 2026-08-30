import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
<<<<<<< HEAD
import { AuditMiddleware } from '../middleware/audit.middleware';
=======
import { UserActivity } from './user-activity.entity';
>>>>>>> bb460233e4a02a259714c6eefceba8397348038a

@Module({
  imports: [TypeOrmModule.forFeature([User, UserActivity])],
  controllers: [UsersController],
  providers: [UsersService],
})
<<<<<<< HEAD
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Applying router-level middleware exclusively to users routes
    consumer.apply(AuditMiddleware).forRoutes(UsersController);
  }
}
=======
export class UsersModule {}
>>>>>>> bb460233e4a02a259714c6eefceba8397348038a
