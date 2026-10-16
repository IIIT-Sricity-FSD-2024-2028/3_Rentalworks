import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OwnerService } from './owner.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestOwnerPlanDto, UpdateOwnerPolicyDto, UpdateOwnerProfileDto } from './owner.dto';

@ApiTags('owner')
@Controller('owner')
@Roles('owner')
@UseGuards(RolesGuard)
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  private getEffectiveOwnerId(userIdHeader?: string): number {
    const id = Number(userIdHeader);
    if (!Number.isInteger(id) || id <= 0) throw new ForbiddenException('Owner account required');
    return id;
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get owner dashboard statistics' })
  getDashboardStats(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getDashboardStats(ownerId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get owner profile' })
  getProfile(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getProfile(ownerId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update owner profile' })
  updateProfile(
    @Headers('x-user-id') userId: string,
    @Body() updateData: UpdateOwnerProfileDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updateProfile(ownerId, updateData);
  }

  @Get('policy')
  @ApiOperation({ summary: 'Get owner policy settings' })
  getPolicy(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Put('policy')
  @ApiOperation({ summary: 'Update owner policy settings' })
  updatePolicy(
    @Headers('x-user-id') userId: string,
    @Body() policyData: UpdateOwnerPolicyDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get owner subscription information' })
  getSubscription(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getSubscription(ownerId);
  }

  @Put('subscription')
  @ApiOperation({ summary: 'Update owner subscription' })
  updateSubscription(
    @Headers('x-user-id') userId: string,
    @Body() planData: RequestOwnerPlanDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updateSubscription(ownerId, planData);
  }
}
