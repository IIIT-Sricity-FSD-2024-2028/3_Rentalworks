import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RentDuesService } from './rent-dues.service';

class PayDueDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiProperty({ required: false, description: 'Payment gateway order id' })
  @IsString()
  @IsOptional()
  gatewayOrderId?: string;

  @ApiProperty({ required: false, description: 'Payment gateway payment id' })
  @IsString()
  @IsOptional()
  gatewayPaymentId?: string;

  @ApiProperty({ required: false, description: 'Payment gateway signature' })
  @IsString()
  @IsOptional()
  gatewaySignature?: string;
}

class MarkPaidDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

class WaiveDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

const toId = (v?: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : undefined;
};

@ApiTags('rent-dues')
@Controller('rent-dues')
@UseGuards(RolesGuard)
export class RentDuesController {
  constructor(private readonly service: RentDuesService) {}

  @Get('my')
  @Roles('tenant', 'admin', 'warden')
  @ApiOperation({ summary: "Logged-in tenant's rent ledger" })
  my(@Headers('x-user-id') userId?: string) {
    const id = toId(userId);
    if (!id) throw new BadRequestException('x-user-id header is required');
    return this.service.findMine(id);
  }

  @Get('ledger')
  @Roles('warden', 'admin', 'owner')
  @ApiOperation({ summary: 'Warden month view of every tenant’s rent status (month=YYYY-MM)' })
  ledger(@Query('month') month: string, @Query('propertyId') propertyId?: string) {
    return this.service.ledger(month, toId(propertyId));
  }

  @Get('tenant/:tenantId')
  @Roles('warden', 'admin', 'owner', 'tenant')
  @ApiOperation({ summary: 'Full rent ledger for one tenant' })
  forTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    if (role === 'tenant' && toId(userId) !== tenantId) throw new ForbiddenException('You can only view your own ledger');
    return this.service.findForTenant(tenantId);
  }

  @Post('run-check')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Run the daily dues job now. Optional ?today=YYYY-MM-DD simulates a date (demo/testing)' })
  runCheck(@Query('today') today?: string) {
    if (today && !/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new BadRequestException('today must be YYYY-MM-DD');
    return this.service.runDailyCheck(today);
  }

  @Post(':id/pay')
  @Roles('tenant', 'admin')
  @ApiOperation({ summary: 'Tenant pays a rent due (amount is taken from the ledger)' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PayDueDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.pay(id, { id: toId(userId), role }, body);
  }

  @Post(':id/mark-paid')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Warden records a cash / offline payment' })
  markPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkPaidDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.markPaidOffline(id, { id: toId(userId), role }, body.note);
  }

  @Post(':id/waive')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Warden waives / excuses a rent due (reason required)' })
  waive(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: WaiveDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.waive(id, { id: toId(userId), role }, body.reason);
  }
}
