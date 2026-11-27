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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RentDuesService } from './rent-dues.service';
import { requireBrowserActor } from '../users/browser-actor';

class PayDueDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedAmount: number;

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
@Controller(['rent-dues', 'users/session/rent-dues'])
@UseGuards(RolesGuard)
export class RentDuesController {
  constructor(private readonly service: RentDuesService, private readonly dataSource: DataSource) {}

  @Get('my')
  @ApiOperation({ summary: "Logged-in tenant's rent ledger" })
  async my(@Req() request: Request) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant']);
    return this.service.findBillingMine(actor.id);
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
  @ApiOperation({ summary: 'Tenant pays a rent due (amount is taken from the ledger)' })
  async pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PayDueDto,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant', 'admin']);
    return this.service.pay(id, actor, body);
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Warden records a cash / offline payment' })
  async markPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkPaidDto,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['warden', 'admin']);
    return this.service.markPaidOffline(id, actor, body.note);
  }

  @Post(':id/waive')
  @ApiOperation({ summary: 'Warden waives / excuses a rent due (reason required)' })
  async waive(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: WaiveDto,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['warden', 'admin']);
    return this.service.waive(id, actor, body.reason);
  }
}
