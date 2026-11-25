import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, CheckoutBookingDto } from './bookings.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  @Post('checkout')
  @ApiOperation({ summary: 'Complete guest booking payment and convert to active tenant' })
  checkout(@Body() checkoutDto: CheckoutBookingDto) {
    return this.bookingsService.completeCheckout(checkoutDto);
  }

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const effectiveTenantId = tenantId || userId;
    return this.bookingsService.findAll(
      effectiveTenantId ? +effectiveTenantId : undefined,
      propertyId ? +propertyId : undefined,
    );
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Get booking by ID' })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'tenant', 'warden')
  @ApiOperation({ summary: 'Create new booking' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update booking status/room' })
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Cancel/Delete booking' })
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(+id);
  }
}
