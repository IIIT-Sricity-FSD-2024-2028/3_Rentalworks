import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, CheckoutBookingDto } from './bookings.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataSource } from 'typeorm';
import { scopeRows, assertCanSee } from '../common/crud';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService, private readonly db: DataSource) { }

  @Post('checkout')
  @Roles('guest', 'tenant')
  @ApiOperation({ summary: 'Complete guest booking payment and convert to active tenant' })
  checkout(@Req() req: any, @Body() checkoutDto: CheckoutBookingDto) {
    // Booking for yourself: the account is always the signed-in one. Booking
    // for a friend (a different email): the friend's account is used/created,
    // and the form can never point at another existing user by id.
    const forFriend = Boolean(checkoutDto.email) && String(checkoutDto.email).trim().toLowerCase() !== String(req.user.email || '').toLowerCase();
    if (forFriend) delete checkoutDto.guestId;
    else {
      checkoutDto.guestId = req.user.id;
      checkoutDto.email = req.user.email || checkoutDto.email;
    }
    return this.bookingsService.completeCheckout(checkoutDto, req.user.id);
  }

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  async findAll(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    // Tenants and guests only ever see their own bookings.
    const self = ['tenant', 'guest'].includes(req.user?.role) ? String(req.user.id) : undefined;
    const effectiveTenantId = self || tenantId || userId;
    // Every role only receives rows it may see (owners: their properties).
    return scopeRows(this.db, req.user, await this.bookingsService.findAll(
      effectiveTenantId ? +effectiveTenantId : undefined,
      propertyId ? +propertyId : undefined,
    ));
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const row = await this.bookingsService.findOne(+id);
    await assertCanSee(this.db, req.user, row);
    return row;
  }

  @Post()
  @Roles('admin', 'tenant', 'warden')
  @ApiOperation({ summary: 'Create new booking' })
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    // A tenant can only create records for themselves.
    if (req.user.role === 'tenant') createBookingDto.tenantId = req.user.id;
    return this.bookingsService.create(createBookingDto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update booking status/room' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    await assertCanSee(this.db, req.user, await this.bookingsService.findOne(+id));
    return this.bookingsService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Cancel/Delete booking' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await assertCanSee(this.db, req.user, await this.bookingsService.findOne(+id));
    return this.bookingsService.remove(+id);
  }
}
