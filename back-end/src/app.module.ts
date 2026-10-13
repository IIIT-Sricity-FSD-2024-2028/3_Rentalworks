import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WardenNotificationsModule } from './warden-notifications/warden-notifications.module';
import { RuleViolationsModule } from './rule-violations/rule-violations.module';
import { RoomsModule } from './rooms/rooms.module';
import { OwnerModule } from './owner/owner.module';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { User } from './users/user.entity';
import { Property } from './properties/property.entity';
import { Booking } from './bookings/booking.entity';
import { Payment } from './payments/payment.entity';
import { Complaint } from './complaints/complaint.entity';
import { Notification } from './notifications/notification.entity';
import { WardenNotification } from './warden-notifications/warden-notification.entity';
import { RuleViolation } from './rule-violations/rule-violation.entity';
import { Room } from './rooms/room.entity';
import { BookingRequest } from './booking-requests/booking-request.entity';
import { TenantStay } from './tenant-stays/tenant-stay.entity';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SuperAdminAnnouncements1800000000000 } from './migrations/1800000000000-SuperAdminAnnouncements';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        ({
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          entities: [
            User,
            Property,
            Booking,
            Payment,
            Complaint,
            Notification,
            WardenNotification,
            RuleViolation,
            Room,
            BookingRequest,
            TenantStay,
          ],
          synchronize: true, // Retained for the owner integration on this branch.
          migrations: [SuperAdminAnnouncements1800000000000],
          migrationsRun: true,
        }) as any,
      inject: [ConfigService],
    }),
    UsersModule,
    PropertiesModule,
    BookingsModule,
    PaymentsModule,
    ComplaintsModule,
    NotificationsModule,
    WardenNotificationsModule,
    RuleViolationsModule,
    RoomsModule,
    OwnerModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware, LoggerMiddleware).forRoutes('*'); // Apply globally to all routes
  }
}
