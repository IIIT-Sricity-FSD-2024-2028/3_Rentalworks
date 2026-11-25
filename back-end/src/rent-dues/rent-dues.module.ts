import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentDue } from './rent-due.entity';
import { RentDuesService } from './rent-dues.service';
import { RentDuesController } from './rent-dues.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RentDue])],
  controllers: [RentDuesController],
  providers: [RentDuesService],
  exports: [RentDuesService],
})
export class RentDuesModule {}
