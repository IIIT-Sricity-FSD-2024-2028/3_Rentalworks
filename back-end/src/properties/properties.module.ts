import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { Property } from './property.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Property]), SubscriptionsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService]
})
export class PropertiesModule {}
