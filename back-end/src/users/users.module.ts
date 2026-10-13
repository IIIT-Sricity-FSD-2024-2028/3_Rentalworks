import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { TenantsController } from './tenants.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Booking } from '../bookings/booking.entity';
import { Room } from '../rooms/room.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Payment } from '../payments/payment.entity';
import { Property } from '../properties/property.entity';
import { AuditMiddleware } from '../middleware/audit.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Booking,
      Room,
      TenantStay,
      Payment,
      Property,
    ]),
  ],
  controllers: [UsersController, TenantsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Applying router-level middleware exclusively to users routes
    consumer.apply(AuditMiddleware).forRoutes(UsersController, TenantsController);
  }
}
