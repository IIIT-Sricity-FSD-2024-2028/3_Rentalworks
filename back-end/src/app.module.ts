import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { BookingRequestsModule } from './booking-requests/booking-requests.module';
import { TenantStaysModule } from './tenant-stays/tenant-stays.module';
import { PaymentsModule } from './payments/payments.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WardenNotificationsModule } from './warden-notifications/warden-notifications.module';
import { RuleViolationsModule } from './rule-violations/rule-violations.module';
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
import { RestoreSharedColumns1800000001000 } from './migrations/1800000001000-RestoreSharedColumns';
import { RecoverSharedColumns1800000002000 } from './migrations/1800000002000-RecoverSharedColumns';
import { OwnerApplicationIntegration1710000000000 } from './migrations/1710000000000-OwnerApplicationIntegration';
import { Subscription } from './owner/subscription.entity';
import { Owner } from './owner/owner.entity';
import { CreateOwnersTable1850000000000 } from './migrations/1850000000000-CreateOwnersTable';
import { RoommateProfile } from './roommates/roommate-profile.entity';
import { RoommatesModule } from './roommates/roommates.module';
import { Issue } from './issues/issue.entity';
import { Service } from './services/service.entity';
import { ServiceRequest } from './service-requests/service-request.entity';
import { IssuesModule } from './issues/issues.module';
import { ServicesModule } from './services/services.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required in back-end/.env');
        if (!config.SUPER_ADMIN_TOKEN_SECRET || config.SUPER_ADMIN_TOKEN_SECRET.length < 32) {
          throw new Error('SUPER_ADMIN_TOKEN_SECRET must be at least 32 characters in back-end/.env');
        }
        return config;
      },
    }),
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
            Subscription,
            Owner,
            RoommateProfile,
            Issue,
            Service,
            ServiceRequest,
          ],
          synchronize: false,
          migrations: [
            OwnerApplicationIntegration1710000000000,
            SuperAdminAnnouncements1800000000000,
            RestoreSharedColumns1800000001000,
            RecoverSharedColumns1800000002000,
            CreateOwnersTable1850000000000,
          ],
          migrationsRun: true,
        }) as any,
      inject: [ConfigService],
    }),
    UsersModule,
    PropertiesModule,
    RoomsModule,
    BookingsModule,
    BookingRequestsModule,
    TenantStaysModule,
    PaymentsModule,
    ComplaintsModule,
    NotificationsModule,
    WardenNotificationsModule,
    RuleViolationsModule,
    OwnerModule,
    SuperAdminModule,
    RoommatesModule,
    IssuesModule,
    ServicesModule,
    ServiceRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware, LoggerMiddleware).forRoutes('*'); // Apply globally to all routes
  }
}
