import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { WardenActionsController } from './warden-actions.controller';
import { WardenActionsService } from './warden-actions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [WardenActionsController],
  providers: [WardenActionsService],
})
export class WardenActionsModule {}
