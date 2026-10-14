import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoommateProfile } from './roommate-profile.entity';
import { RoommatesService } from './roommates.service';
import { RoommatesController } from './roommates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoommateProfile])],
  controllers: [RoommatesController],
  providers: [RoommatesService],
  exports: [RoommatesService],
})
export class RoommatesModule {}
