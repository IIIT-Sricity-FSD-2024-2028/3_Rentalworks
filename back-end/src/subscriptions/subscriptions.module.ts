import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionPayment } from './subscription-payment.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Subscription,
      SubscriptionPayment,
      User
    ])
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
