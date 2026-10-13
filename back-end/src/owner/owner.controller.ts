import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OwnerService } from './owner.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('owner')
@Controller('owner')
@UseGuards(RolesGuard)
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  private getEffectiveOwnerId(userIdHeader?: string): number {
    if (userIdHeader && !isNaN(Number(userIdHeader))) {
      const parsed = Number(userIdHeader);
      return parsed === 6 ? 16 : parsed;
    }
    return 16; // Default to Rajesh Kumar in Neon Cloud (id 16)
  }

  @Get('dashboard-stats')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner dashboard statistics' })
  getDashboardStats(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getDashboardStats(ownerId);
  }

  @Get('profile')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner profile' })
  getProfile(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getProfile(ownerId);
  }

  @Put('profile')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner profile' })
  updateProfile(
    @Headers('x-user-id') userId: string,
    @Body() updateData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updateProfile(ownerId, updateData);
  }

  @Get('policy')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner policy settings' })
  getPolicy(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Put('policy')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner policy settings' })
  updatePolicy(
    @Headers('x-user-id') userId: string,
    @Body() policyData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Get('subscription')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner subscription information' })
  getSubscription(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getSubscription(ownerId);
  }

  @Put('subscription')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner subscription' })
  updateSubscription(
    @Headers('x-user-id') userId: string,
    @Body() planData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updateSubscription(ownerId, planData);
  }
}
