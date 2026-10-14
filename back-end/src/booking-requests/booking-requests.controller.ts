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
import { BookingRequestsService } from './booking-requests.service';
import {
  CreateBookingRequestDto,
  UpdateBookingRequestDto,
} from './booking-requests.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('booking-requests')
@Controller('booking-requests')
@UseGuards(RolesGuard)
export class BookingRequestsController {
  constructor(
    private readonly bookingRequestsService: BookingRequestsService,
  ) {}

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all booking requests' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.bookingRequestsService.findAll(
      tenantId ? +tenantId : undefined,
      propertyId ? +propertyId : undefined,
    );
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get booking request by ID' })
  findOne(@Param('id') id: string) {
    return this.bookingRequestsService.findOne(+id);
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
  update(@Param('id') id: string, @Body() updateDto: UpdateBookingRequestDto) {
    return this.bookingRequestsService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Delete booking request' })
  remove(@Param('id') id: string) {
    return this.bookingRequestsService.remove(+id);
  }
}
