import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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

@Module({
  imports: [UsersModule, PropertiesModule, BookingsModule, PaymentsModule, ComplaintsModule, NotificationsModule],
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
