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
import { OwnerGuard } from './owner.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('api')
@Controller('api')
@UseGuards(OwnerGuard)
export class ApiController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly complaintsService: ComplaintsService,
    private readonly notificationsService: NotificationsService,
    private readonly ownerService: OwnerService,
  ) {}

  private getEffectiveOwnerId(userIdHeader?: string): number { return Number(userIdHeader); }

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
    return this.propertiesService.findAll(this.getEffectiveOwnerId(userId));
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
    createPropertyDto.ownerId = this.getEffectiveOwnerId(userId);
    return this.propertiesService.create(Object.assign({}, createPropertyDto, { status: 'pending', docsVerified: false, inspectionPassed: false, compliance: 'Pending', fireSafety: 'Unverified', safetyScore: 0 }));
  }

  @Put('properties/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update property' })
  updateProperty(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    delete updatePropertyDto.ownerId;
    delete updatePropertyDto.status;
    delete updatePropertyDto.docsVerified;
    delete updatePropertyDto.inspectionPassed;
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
    return this.ownerService.getIssues(this.getEffectiveOwnerId(userId));
  }

  @Get('issues/:id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get issue by ID' })
  async findOneIssue(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    const issues = await this.ownerService.getIssues(Number(userId));
    return issues.find(issue => String(issue.id) === id);
  }

  @Post('issues')
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Create new issue' })
  createIssue(@Headers('x-user-id') userId: string, @Body() createComplaintDto: CreateComplaintDto) {
    createComplaintDto.tenantId = Number(userId);
    return this.complaintsService.create(createComplaintDto);
  }

  @Put('issues/:id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update issue' })
  updateIssue(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
  ) {
    if (id.startsWith('issue-')) return this.ownerService.updateTenantIssue(Number(id.slice(6)), updateComplaintDto.status || '');
    return this.complaintsService.update(Number(id), updateComplaintDto);
  }

  @Delete('issues/:id')
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Delete issue' })
  removeIssue(@Param('id') id: string) {
    if (id.startsWith('issue-')) return this.ownerService.removeTenantIssue(Number(id.slice(6)));
    return this.complaintsService.remove(Number(id));
  }

  // ==========================================
  // 4. NOTIFICATIONS
  // ==========================================
  @Get('notifications')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all notifications' })
  findAllNotifications(@Headers('x-user-id') userId: string) {
    return this.ownerService.getNotifications(Number(userId));
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
    return this.ownerService.sendNotification(Number(userId), createNotificationDto);
  }

  @Put('notifications/mark-all-read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead(@Headers('x-user-id') userId: string) {
    return this.ownerService.markAllNotificationsRead(Number(userId));
  }

  @Put('notifications/:id/read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark single notification as read' })
  markNotificationRead(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.ownerService.updateNotificationReceipt(Number(userId), Number(id));
  }

  @Delete('notifications')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Clear all notifications' })
  clearAllNotifications(@Headers('x-user-id') userId: string) {
    return this.ownerService.clearAllNotifications(Number(userId));
  }

  @Delete('notifications/:id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Delete notification' })
  removeNotification(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.ownerService.updateNotificationReceipt(Number(userId), Number(id), true);
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
  @Put('profile/password')
  changePassword(@Headers('x-user-id') userId: string, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.ownerService.changePassword(Number(userId), body);
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
