import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantStay } from './tenant-stay.entity';
import { TenantStaysService } from './tenant-stays.service';
import { TenantStaysController } from './tenant-stays.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TenantStay])],
  controllers: [TenantStaysController],
  providers: [TenantStaysService],
  exports: [TenantStaysService],
})
export class TenantStaysModule {}
