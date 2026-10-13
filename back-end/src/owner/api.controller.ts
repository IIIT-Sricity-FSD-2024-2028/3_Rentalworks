import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PropertiesService } from '../properties/properties.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OwnerService } from './owner.service';
import { CreatePropertyDto, UpdatePropertyDto } from '../properties/properties.dto';
import { CreateComplaintDto, UpdateComplaintDto } from '../complaints/complaints.dto';
import { CreateNotificationDto, UpdateNotificationDto } from '../notifications/notifications.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('api')
@Controller('api')
@UseGuards(RolesGuard)
export class ApiController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly complaintsService: ComplaintsService,
    private readonly notificationsService: NotificationsService,
    private readonly ownerService: OwnerService,
  ) {}

  private getEffectiveOwnerId(userIdHeader?: string): number {
    if (userIdHeader && !isNaN(Number(userIdHeader))) {
      const parsed = Number(userIdHeader);
      return parsed === 6 ? 16 : parsed;
    }
    return 16;
  }

  // ==========================================
  // 1. DASHBOARD
  // ==========================================
  @Get('dashboard/stats')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner dashboard statistics' })
  getDashboardStats(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getDashboardStats(ownerId);
  }

  // ==========================================
  // 2. PROPERTIES
  // ==========================================
  @Get('properties')
  @ApiOperation({ summary: 'Get all properties' })
  findAllProperties(
    @Query('ownerId') ownerId?: string,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    let effectiveOwnerId: number | undefined = undefined;
    if (ownerId && !isNaN(Number(ownerId))) {
      const parsed = Number(ownerId);
      effectiveOwnerId = parsed === 6 ? 16 : parsed;
    } else if (role === 'owner' || !role) {
      effectiveOwnerId = this.getEffectiveOwnerId(userId);
    }
    return this.propertiesService.findAll(effectiveOwnerId);
  }

  @Get('properties/:id')
  @ApiOperation({ summary: 'Get property by id' })
  findOneProperty(@Param('id') id: string) {
    return this.propertiesService.findOne(Number(id));
  }

  @Post('properties')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create new property' })
  createProperty(
    @Headers('x-user-id') userId: string,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    if (!createPropertyDto.ownerId || Number(createPropertyDto.ownerId) === 6) {
      createPropertyDto.ownerId = this.getEffectiveOwnerId(userId);
    }
    return this.propertiesService.create(createPropertyDto);
  }

  @Put('properties/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update property' })
  updateProperty(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(Number(id), updatePropertyDto);
  }

  @Delete('properties/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete property' })
  removeProperty(@Param('id') id: string) {
    return this.propertiesService.remove(Number(id));
  }

  // ==========================================
  // 3. ISSUES / COMPLAINTS
  // ==========================================
  @Get('issues')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all issues / complaints' })
  findAllIssues(
    @Query('ownerId') ownerId?: string,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    let effectiveOwnerId: number | undefined = undefined;
    if (ownerId && !isNaN(Number(ownerId))) {
      const parsed = Number(ownerId);
      effectiveOwnerId = parsed === 6 ? 16 : parsed;
    } else if (role === 'owner' || !role) {
      effectiveOwnerId = this.getEffectiveOwnerId(userId);
    }
    return this.complaintsService.findAll(effectiveOwnerId);
  }

  @Get('issues/:id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get issue by ID' })
  findOneIssue(@Param('id') id: string) {
    return this.complaintsService.findOne(Number(id));
  }

  @Post('issues')
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Create new issue' })
  createIssue(@Body() createComplaintDto: CreateComplaintDto) {
    return this.complaintsService.create(createComplaintDto);
  }

  @Put('issues/:id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update issue' })
  updateIssue(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
  ) {
    return this.complaintsService.update(Number(id), updateComplaintDto);
  }

  @Delete('issues/:id')
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Delete issue' })
  removeIssue(@Param('id') id: string) {
    return this.complaintsService.remove(Number(id));
  }

  // ==========================================
  // 4. NOTIFICATIONS
  // ==========================================
  @Get('notifications')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all notifications' })
  findAllNotifications() {
    return this.notificationsService.findAll();
  }

  @Get('notifications/:id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get notification by ID' })
  findOneNotification(@Param('id') id: string) {
    return this.notificationsService.findOne(Number(id));
  }

  @Post('notifications')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Create new notification' })
  createNotification(
    @Headers('x-user-id') userId: string,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    if (!createNotificationDto.byUserId) {
      createNotificationDto.byUserId = this.getEffectiveOwnerId(userId);
    }
    return this.notificationsService.create(createNotificationDto);
  }

  @Put('notifications/mark-all-read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead() {
    return this.notificationsService.markAllRead();
  }

  @Put('notifications/:id/read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark single notification as read' })
  markNotificationRead(@Param('id') id: string) {
    return this.notificationsService.markRead(Number(id));
  }

  @Put('notifications/:id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update notification' })
  updateNotification(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(Number(id), updateNotificationDto);
  }

  @Delete('notifications/:id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Delete notification' })
  removeNotification(@Param('id') id: string) {
    return this.notificationsService.remove(Number(id));
  }

  // ==========================================
  // 5. POLICY
  // ==========================================
  @Get('policies')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner policy' })
  getPolicies(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Get('policy')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner policy alias' })
  getPolicyAlias(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Put('policies')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner policy' })
  updatePolicies(
    @Headers('x-user-id') userId: string,
    @Body() policyData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Put('policies/:id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner policy by id' })
  updatePolicyById(
    @Headers('x-user-id') userId: string,
    @Body() policyData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Put('policy')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update owner policy alias' })
  updatePolicyAlias(
    @Headers('x-user-id') userId: string,
    @Body() policyData: any,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  // ==========================================
  // 6. PROFILE
  // ==========================================
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

  // ==========================================
  // 7. SUBSCRIPTION
  // ==========================================
  @Get('subscription')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner subscription' })
  getSubscription(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getSubscription(ownerId);
  }

  @Get('subscriptions')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get owner subscription plural alias' })
  getSubscriptionsAlias(@Headers('x-user-id') userId?: string) {
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
