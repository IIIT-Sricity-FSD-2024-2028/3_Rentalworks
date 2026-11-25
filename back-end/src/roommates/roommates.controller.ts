import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { RoommatesService } from './roommates.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('roommates')
@Controller('roommates')
export class RoommatesController {
  constructor(private readonly roommatesService: RoommatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active tenant profiles for roommate matching' })
  findTenants(@Query('propertyId') propertyId: string) {
    return this.roommatesService.findTenantsByProperty(propertyId ? +propertyId : 1);
  }

  @Post('calculate-matches')
  @ApiOperation({ summary: 'Calculate smart roommate match percentages based on guest criteria' })
  calculateMatches(@Body() guestProfile: any) {
    return this.roommatesService.calculateMatches(guestProfile);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Save guest roommate criteria profile' })
  saveProfile(@Body() profileDto: any) {
    return this.roommatesService.saveGuestProfile(profileDto);
  }
}
