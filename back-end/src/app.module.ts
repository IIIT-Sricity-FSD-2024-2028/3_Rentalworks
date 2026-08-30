import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { User } from './users/user.entity';
import { UserActivity } from './users/user-activity.entity';
import { Property } from './properties/property.entity';
import { Booking } from './bookings/booking.entity';
import { Payment } from './payments/payment.entity';
import { Complaint } from './complaints/complaint.entity';
import { Notification } from './notifications/notification.entity';
import { Remark } from './remarks/remark.entity';
import { RemarksModule } from './remarks/remarks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'better-sqlite3' as any,
        database: configService.get<string>('DB_NAME', 'rentalworks.sqlite'),
        entities: [User, UserActivity, Property, Booking, Payment, Complaint, Notification, Remark],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule, PropertiesModule, BookingsModule, PaymentsModule, ComplaintsModule, NotificationsModule, RemarksModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, LoggerMiddleware)
      .forRoutes('*'); // Apply globally to all routes
  }
}
