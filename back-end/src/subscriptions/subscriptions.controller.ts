import { Controller, Get, Post, Body, Param, Query, Req, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutDto, VerifyPaymentDto, RenewSubscriptionDto, UpgradeSubscriptionDto } from './subscriptions.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  private extractOwnerId(req: any, headers: any, queryOwnerId?: string, bodyOwnerId?: number): number {
    const fromHeaders = headers['x-user-id'] ? parseInt(headers['x-user-id']) : null;
    const fromUser = req.user?.id ? parseInt(req.user.id) : null;
    const fromQuery = queryOwnerId ? parseInt(queryOwnerId) : null;
    const fromBody = bodyOwnerId ? Number(bodyOwnerId) : null;

    const id = fromHeaders || fromUser || fromQuery || fromBody;
    if (!id || isNaN(id)) {
      throw new BadRequestException('User / Owner ID is required. Please provide x-user-id header or ownerId.');
    }
    return id;
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  @Roles('owner', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get current subscription details for owner' })
  getCurrent(
    @Req() req: any,
    @Headers() headers: any,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId);
    return this.subscriptionsService.getCurrentSubscription(ownerId);
  }

  @Post('checkout')
  @Roles('owner')
  @ApiOperation({ summary: 'Initiate subscription checkout order' })
  checkout(
    @Req() req: any,
    @Headers() headers: any,
    @Body() dto: CheckoutDto,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId, (dto as any).ownerId);
    return this.subscriptionsService.checkout(ownerId, dto);
  }

  @Post('verify-payment')
  @Roles('owner')
  @ApiOperation({ summary: 'Verify payment and activate subscription' })
  verifyPayment(
    @Req() req: any,
    @Headers() headers: any,
    @Body() dto: VerifyPaymentDto & { planId: number; paymentMethod?: string; ownerId?: number },
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId, dto.ownerId);
    if (!dto.planId) {
      throw new BadRequestException('planId is required for payment verification');
    }
    return this.subscriptionsService.verifyPayment(ownerId, dto.planId, dto, dto.paymentMethod);
  }

  @Post('upgrade')
  @Roles('owner')
  @ApiOperation({ summary: 'Initiate plan upgrade' })
  upgrade(
    @Req() req: any,
    @Headers() headers: any,
    @Body() dto: UpgradeSubscriptionDto,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId, (dto as any).ownerId);
    return this.subscriptionsService.upgrade(ownerId, dto);
  }

  @Post('renew')
  @Roles('owner')
  @ApiOperation({ summary: 'Initiate plan renewal' })
  renew(
    @Req() req: any,
    @Headers() headers: any,
    @Body() dto: RenewSubscriptionDto,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId, (dto as any).ownerId);
    return this.subscriptionsService.renew(ownerId, dto);
  }

  @Get('history')
  @Roles('owner', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get owner subscription history' })
  getSubscriptionHistory(
    @Req() req: any,
    @Headers() headers: any,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId);
    return this.subscriptionsService.getSubscriptionHistory(ownerId);
  }

  @Get('payments')
  @Roles('owner', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get owner payment history' })
  getPaymentHistory(
    @Req() req: any,
    @Headers() headers: any,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const ownerId = this.extractOwnerId(req, headers, queryOwnerId);
    return this.subscriptionsService.getPaymentHistory(ownerId);
  }

  @Get('payments/:id/receipt')
  @Roles('owner', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get receipt details for a payment' })
  getReceipt(
    @Param('id') paymentId: string,
    @Req() req: any,
    @Headers() headers: any,
    @Query('ownerId') queryOwnerId?: string
  ) {
    const role = headers['x-role'] || req.user?.role;
    const userId = headers['x-user-id'] ? parseInt(headers['x-user-id']) : (queryOwnerId ? parseInt(queryOwnerId) : undefined);
    return this.subscriptionsService.getReceipt(+paymentId, userId, role);
  }

  // Admin & Super Admin Endpoints
  @Get('admin/stats')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get aggregated subscription and payment statistics for admin' })
  getAdminStats() {
    return this.subscriptionsService.getAdminStats();
  }

  @Get('admin/all')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get all subscriptions for admin review' })
  getAllSubscriptions() {
    return this.subscriptionsService.getAllAdminSubscriptions();
  }

  @Get('admin/payments')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get all subscription payments for admin review' })
  getAllPayments() {
    return this.subscriptionsService.getAllAdminPayments();
  }
}
