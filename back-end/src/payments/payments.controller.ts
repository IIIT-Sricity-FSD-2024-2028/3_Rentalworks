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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataSource } from 'typeorm';
import { scopeRows, assertCanSee } from '../common/crud';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService, private readonly db: DataSource) {}

  @Get('revenue')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get total platform revenue' })
  getRevenue() {
    return this.paymentsService.getRevenue();
  }

  @Get()
  @Roles('super_admin', 'admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    // Tenants only ever see their own payments.
    if (req.user?.role === 'tenant') tenantId = String(req.user.id);
    // Every role only receives rows it may see (owners: their properties).
    return scopeRows(this.db, req.user, await this.paymentsService.findAll(
      tenantId ? +tenantId : undefined,
      propertyId ? +propertyId : undefined,
    ));
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const row = await this.paymentsService.findOne(+id);
    await assertCanSee(this.db, req.user, row);
    return row;
  }

  @Post()
  @Roles('super_admin', 'admin', 'tenant')
  @ApiOperation({ summary: 'Submit new payment' })
  create(@Req() req: any, @Body() createPaymentDto: CreatePaymentDto) {
    // A tenant can only create records for themselves.
    if (req.user.role === 'tenant') createPaymentDto.tenantId = req.user.id;
    return this.paymentsService.create(createPaymentDto);
  }

  @Put(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Update payment status' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    await assertCanSee(this.db, req.user, await this.paymentsService.findOne(+id));
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Delete payment record' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await assertCanSee(this.db, req.user, await this.paymentsService.findOne(+id));
    return this.paymentsService.remove(+id);
  }
}
