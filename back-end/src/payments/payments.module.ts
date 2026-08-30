import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Property } from '../properties/property.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Property])],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
