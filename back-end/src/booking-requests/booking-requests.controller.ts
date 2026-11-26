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
  Req,
} from '@nestjs/common';
import { BookingRequestsService } from './booking-requests.service';
import {
  CreateBookingRequestDto,
  UpdateBookingRequestDto,
} from './booking-requests.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataSource } from 'typeorm';
import { AuthUser, assertCanSee, scopeRows } from '../common/crud';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('booking-requests')
@Controller('booking-requests')
@UseGuards(RolesGuard)
export class BookingRequestsController {
  constructor(
    private readonly bookingRequestsService: BookingRequestsService,
    private readonly db: DataSource,
  ) {}

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all booking requests' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  async findAll(
    @Req() req: { user: AuthUser },
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    // Owners see their properties' requests; tenants their own.
    return scopeRows(this.db, req.user, await this.bookingRequestsService.findAll(
      tenantId ? +tenantId : undefined,
      propertyId ? +propertyId : undefined,
    ));
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get booking request by ID' })
  async findOne(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const row = await this.bookingRequestsService.findOne(+id);
    await assertCanSee(this.db, req.user, row);
    return row;
  }

  @Post()
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Submit new booking request' })
  create(@Body() createDto: CreateBookingRequestDto) {
    return this.bookingRequestsService.create(createDto);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update booking request status' })
  async update(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() updateDto: UpdateBookingRequestDto) {
    await assertCanSee(this.db, req.user, await this.bookingRequestsService.findOne(+id));
    return this.bookingRequestsService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Delete booking request' })
  async remove(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    await assertCanSee(this.db, req.user, await this.bookingRequestsService.findOne(+id));
    return this.bookingRequestsService.remove(+id);
  }
}
