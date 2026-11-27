import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/crud';
import { Room } from '../rooms/room.entity';
import { Property } from '../properties/property.entity';
import { RentDue } from '../rent-dues/rent-due.entity';
import { billedAmountForDue } from '../rent-dues/service-billing';
import { PaymentGatewayService, checkoutPrice } from './payment-gateway.service';

/** Receipts tie a gateway order to exactly one thing being paid for. */
export const checkoutReceipt = (userId: number, propertyId: number, roomNumber: string) => `checkout:${userId}:${propertyId}:${roomNumber}`;
export const rentReceipt = (dueId: number) => `rent:${dueId}`;

/**
 *   GET  /payment-gateway/config     which mode is active (public)
 *   POST /payment-gateway/order      { purpose: 'checkout', propertyId, roomNumber } | { purpose: 'rent', rentDueId }
 *   POST /payment-gateway/test-pay   { orderId }  — test mode only
 * The price is always read from the database.
 */
@ApiTags('payment-gateway')
@Controller('payment-gateway')
@UseGuards(RolesGuard)
export class PaymentGatewayController {
  constructor(private readonly gateway: PaymentGatewayService, private readonly db: DataSource) {}

  @Get('config')
  config() {
    return this.gateway.config();
  }

  @Post('order')
  @Roles('guest', 'tenant')
  async order(@Req() req: { user: AuthUser }, @Body() body: { purpose?: string; propertyId?: number; roomNumber?: string; rentDueId?: number }) {
    if (body.purpose === 'rent') {
      const due = await this.db.getRepository(RentDue).findOneBy({ id: Number(body.rentDueId) });
      if (!due) throw new NotFoundException('Rent due not found');
      if (due.tenantId !== req.user.id) throw new ForbiddenException('This rent belongs to another tenant');
      if (['paid', 'waived'].includes(String(due.status))) throw new BadRequestException('This rent is already settled');
      // Rent plus the completed service usage billed to this due (same total /rent-dues/:id/pay checks).
      const total = await billedAmountForDue(this.db.manager, due);
      const order = await this.gateway.createOrder(total, rentReceipt(due.id));
      return { ...order, breakdown: { rent: Number(due.amount), services: Math.round((total - Number(due.amount)) * 100) / 100, total } };
    }

    if (body.purpose === 'checkout') {
      const propertyId = Number(body.propertyId);
      const property = await this.db.getRepository(Property).findOne({ where: { id: propertyId }, relations: { owner: true } });
      // Only live listings: approved, and the owner's account is active (not suspended).
      if (!property || String(property.status).toLowerCase() !== 'approved' || property.owner?.status !== 'active') throw new NotFoundException('This PG is not available for booking');
      const roomNumber = String(body.roomNumber || '').trim();
      const room = roomNumber ? await this.db.getRepository(Room).findOneBy({ propertyId, roomNumber }) : null;
      if (!room) throw new BadRequestException('Choose a room to book');
      const status = String(room.status || '').toLowerCase();
      if (status === 'maintenance' || status === 'full' || (room.currentOccupancy || 0) >= room.capacity) {
        throw new BadRequestException(`Room ${room.roomNumber} is no longer available. Please choose another room.`);
      }
      const price = checkoutPrice(Number(room.rent));
      const order = await this.gateway.createOrder(price.total, checkoutReceipt(req.user.id, propertyId, room.roomNumber));
      return { ...order, breakdown: price };
    }

    throw new BadRequestException("purpose must be 'checkout' or 'rent'");
  }

  @Post('test-pay')
  @Roles('guest', 'tenant')
  testPay(@Body() body: { orderId?: string }) {
    return this.gateway.testPay(String(body.orderId || ''));
  }
}
