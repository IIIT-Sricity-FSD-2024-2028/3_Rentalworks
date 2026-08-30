import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemarksController } from './remarks.controller';
import { RemarksService } from './remarks.service';
import { Remark } from './remark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Remark])],
  controllers: [RemarksController],
  providers: [RemarksService],
  exports: [RemarksService],
})
export class RemarksModule {}
