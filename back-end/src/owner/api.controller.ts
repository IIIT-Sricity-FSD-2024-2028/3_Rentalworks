import { ownerPropertySummary } from './property-summary';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
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
import { ChangeOwnerPasswordDto, RequestOwnerPlanDto, UpdateOwnerPolicyDto, UpdateOwnerProfileDto } from './owner.dto';

import { WardenNotificationsService } from '../warden-notifications/warden-notifications.service';

@ApiTags('api')
@Controller('api')
@Roles('owner')
@UseGuards(RolesGuard)
export class ApiController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly complaintsService: ComplaintsService,
    private readonly notificationsService: NotificationsService,
    private readonly ownerService: OwnerService,
    private readonly wardenNotificationsService: WardenNotificationsService,
  ) {}

  private getEffectiveOwnerId(userIdHeader?: string): number {
    const id = Number(userIdHeader);
    if (!Number.isInteger(id) || id <= 0) throw new ForbiddenException('Owner account required');
    return id;
  }

  private async checkPropertyOwner(id: number, userId: string) {
    const property = await this.propertiesService.findOne(id);
    if (property.ownerId !== this.getEffectiveOwnerId(userId)) {
      throw new ForbiddenException('Property does not belong to this owner');
    }
    return property;
  }

  private async checkIssueOwner(id: number, userId: string) {
    const issue = await this.complaintsService.findOne(id);
    await this.checkPropertyOwner(issue.propertyId, userId);
    return issue;
  }

  // ==========================================
  // 1. DASHBOARD
  // ==========================================
  @Get('dashboard/stats')
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
  async findAllProperties(@Headers('x-user-id') userId: string) {
    const properties = await this.propertiesService.findAll(this.getEffectiveOwnerId(userId));
    return properties.map(ownerPropertySummary);
  }

  @Get('properties/:id')
  @ApiOperation({ summary: 'Get property by id' })
  findOneProperty(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.checkPropertyOwner(Number(id), userId);
  }

  @Post('properties')
  @ApiOperation({ summary: 'Create new property' })
  createProperty(
    @Headers('x-user-id') userId: string,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    createPropertyDto.ownerId = this.getEffectiveOwnerId(userId);
    return this.propertiesService.create(createPropertyDto);
  }

  @Put('properties/:id')
  @ApiOperation({ summary: 'Update property' })
  async updateProperty(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @Headers('x-user-id') userId: string,
  ) {
    await this.checkPropertyOwner(Number(id), userId);
    if (updatePropertyDto.ownerId !== undefined && updatePropertyDto.ownerId !== Number(userId)) throw new ForbiddenException('Owner cannot be changed');
    return this.propertiesService.update(Number(id), updatePropertyDto);
  }

  @Delete('properties/:id')
  @ApiOperation({ summary: 'Delete property' })
  async removeProperty(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    await this.checkPropertyOwner(Number(id), userId);
    return this.propertiesService.remove(Number(id));
  }

  // ==========================================
  // 3. ISSUES / COMPLAINTS
  // ==========================================
  @Get('issues')
  @ApiOperation({ summary: 'Get all issues / complaints' })
  findAllIssues(@Headers('x-user-id') userId: string) {
    return this.complaintsService.findByOwner(this.getEffectiveOwnerId(userId));
  }

  @Get('issues/:id')
  @ApiOperation({ summary: 'Get issue by ID' })
  findOneIssue(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.checkIssueOwner(Number(id), userId);
  }

  @Post('issues')
  @ApiOperation({ summary: 'Create new issue' })
  async createIssue(@Body() createComplaintDto: CreateComplaintDto, @Headers('x-user-id') userId: string) {
    await this.checkPropertyOwner(createComplaintDto.propertyId, userId);
    createComplaintDto.tenantId = this.getEffectiveOwnerId(userId);
    return this.complaintsService.create(createComplaintDto);
  }

  @Put('issues/:id')
  @ApiOperation({ summary: 'Update issue' })
  async updateIssue(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
    @Headers('x-user-id') userId: string,
  ) {
    await this.checkIssueOwner(Number(id), userId);
    return this.complaintsService.update(Number(id), updateComplaintDto);
  }

  @Delete('issues/:id')
  @ApiOperation({ summary: 'Delete issue' })
  async removeIssue(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    await this.checkIssueOwner(Number(id), userId);
    return this.complaintsService.remove(Number(id));
  }

  // ==========================================
  // 4. NOTIFICATIONS
  // ==========================================
  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications' })
  findAllNotifications(@Headers('x-user-id') userId: string) {
    return this.notificationsService.findForOwner(this.getEffectiveOwnerId(userId));
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification by ID' })
  async findOneNotification(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    const notification = await this.notificationsService.findOne(Number(id));
    if (notification.userId !== Number(userId) && notification.byUserId !== Number(userId)) {
      throw new ForbiddenException('Notification does not belong to this owner');
    }
    return notification;
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create new notification' })
  async createNotification(
    @Headers('x-user-id') userId: string,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    try {
      const ownerId = this.getEffectiveOwnerId(userId);
      createNotificationDto.byUserId = ownerId;
      delete createNotificationDto.userId;

      const rawRole = (createNotificationDto.targetRole || 'all').toLowerCase();
      const validRoles = ['warden', 'admin', 'tenant', 'super_admin', 'all'];
      if (!validRoles.includes(rawRole)) {
        throw new ForbiddenException('Choose a valid recipient (Warden, Admin, Tenant, Super Admin, or All)');
      }
      createNotificationDto.targetRole = rawRole;
      createNotificationDto.recipients = createNotificationDto.recipients || 1;
      createNotificationDto.deliveryStatus = createNotificationDto.deliveryStatus || 'sent';

      // Get owner details for sender info
      const owner = await this.ownerService.getProfile(ownerId).catch(() => null);
      const senderName = owner?.name || 'Property Owner';

      // If target is warden or all, also replicate to warden_notifications table
      if (rawRole === 'warden' || rawRole === 'all') {
        try {
          await this.wardenNotificationsService.create({
            title: createNotificationDto.title,
            message: createNotificationDto.message,
            type: createNotificationDto.type || 'announcement',
            priority: createNotificationDto.priority || 'medium',
            senderName,
            senderRole: 'owner',
            propertyName: 'All Properties',
            roomNumber: '',
          });
        } catch (e) {
          console.warn('Could not replicate to warden_notifications:', e);
        }
      }

      return await this.notificationsService.create(createNotificationDto);
    } catch (err) {
      console.error('CREATE NOTIFICATION FAILED:', err);
      throw err;
    }
  }

  @Put('notifications/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead(@Headers('x-user-id') userId: string) {
    return this.notificationsService.markAllForOwner(this.getEffectiveOwnerId(userId));
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markNotificationRead(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    await this.findOneNotification(id, userId);
    return this.notificationsService.markRead(Number(id));
  }

  @Put('notifications/:id')
  @ApiOperation({ summary: 'Update notification' })
  async updateNotification(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Headers('x-user-id') userId: string,
  ) {
    await this.findOneNotification(id, userId);
    return this.notificationsService.update(Number(id), updateNotificationDto);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete notification' })
  async removeNotification(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    await this.findOneNotification(id, userId);
    return this.notificationsService.remove(Number(id));
  }

  // ==========================================
  // 5. POLICY
  // ==========================================
  @Get('policies')
  @ApiOperation({ summary: 'Get owner policy' })
  getPolicies(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Get('policy')
  @ApiOperation({ summary: 'Get owner policy alias' })
  getPolicyAlias(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getPolicy(ownerId);
  }

  @Put('policies')
  @ApiOperation({ summary: 'Update owner policy' })
  updatePolicies(
    @Headers('x-user-id') userId: string,
    @Body() policyData: UpdateOwnerPolicyDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Update owner policy by id' })
  updatePolicyById(
    @Headers('x-user-id') userId: string,
    @Body() policyData: UpdateOwnerPolicyDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  @Put('policy')
  @ApiOperation({ summary: 'Update owner policy alias' })
  updatePolicyAlias(
    @Headers('x-user-id') userId: string,
    @Body() policyData: UpdateOwnerPolicyDto,
  ) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.updatePolicy(ownerId, policyData);
  }

  // ==========================================
  // 6. PROFILE
  // ==========================================
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

  @Put('profile/password')
  changePassword(
    @Headers('x-user-id') userId: string,
    @Body() body: ChangeOwnerPasswordDto,
  ) {
    return this.ownerService.changePassword(this.getEffectiveOwnerId(userId), body.currentPassword, body.newPassword);
  }

  // ==========================================
  // 7. SUBSCRIPTION
  // ==========================================
  @Get('subscription')
  @ApiOperation({ summary: 'Get owner subscription' })
  getSubscription(@Headers('x-user-id') userId?: string) {
    const ownerId = this.getEffectiveOwnerId(userId);
    return this.ownerService.getSubscription(ownerId);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get owner subscription plural alias' })
  getSubscriptionsAlias(@Headers('x-user-id') userId?: string) {
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
