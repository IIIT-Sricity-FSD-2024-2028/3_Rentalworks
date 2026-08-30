import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('revenue')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get total platform revenue' })
  getRevenue() {
    return this.paymentsService.getRevenue();
  }

  @Get()
  @Roles('super_admin', 'admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all payments' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'tenant')
  @ApiOperation({ summary: 'Submit new payment' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Put(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Update payment status' })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Delete payment record' })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
