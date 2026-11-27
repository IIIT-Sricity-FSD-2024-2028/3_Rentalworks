import { RoommateProfilesController } from './roommate-profiles.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoommateProfile } from './roommate-profile.entity';
import { Room } from '../rooms/room.entity';
import { RoommatesService } from './roommates.service';
import { RoommatesController } from './roommates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoommateProfile, Room])],
  controllers: [RoommatesController, RoommateProfilesController],
  providers: [RoommatesService],
  exports: [RoommatesService],
})
export class RoommatesModule {}
