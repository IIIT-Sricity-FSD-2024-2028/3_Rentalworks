import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingRequest } from './booking-request.entity';
import { BookingRequestsService } from './booking-requests.service';
import { BookingRequestsController } from './booking-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BookingRequest])],
  controllers: [BookingRequestsController],
  providers: [BookingRequestsService],
  exports: [BookingRequestsService],
})
export class BookingRequestsModule {}
