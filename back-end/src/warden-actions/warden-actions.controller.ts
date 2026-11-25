import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WardenActionsService } from './warden-actions.service';

class NotifyTenantDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() title?: string;
  @ApiProperty() @IsString() message: string;
  @ApiProperty({ required: false, description: 'rent_reminder | rule_notice | custom' }) @IsString() @IsOptional() kind?: string;
  @ApiProperty({ required: false }) @IsNumber() @IsOptional() dueId?: number;
  @ApiProperty({ required: false }) @IsString() @IsOptional() priority?: string;
}

class EscalateDto {
  @ApiProperty() @IsString() message: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() reason?: string;
  @ApiProperty({ required: false, description: 'unpaid_rent | violation' }) @IsString() @IsOptional() category?: string;
}

class EvictDto {
  @ApiProperty() @IsString() reason: string;
}

const toId = (v?: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : undefined;
};

@ApiTags('warden-actions')
@Controller('warden-actions')
@UseGuards(RolesGuard)
export class WardenActionsController {
  constructor(private readonly service: WardenActionsService) {}

  @Post('tenants/:id/notify')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Send a direct notification / rent reminder to a tenant' })
  notify(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NotifyTenantDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.notifyTenant(id, { id: toId(userId), role }, body);
  }

  @Post('tenants/:id/escalate')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Escalate a tenant (unpaid dues / violation) to the property owner' })
  escalate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EscalateDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.escalateToOwner(id, { id: toId(userId), role }, body);
  }

  @Post('tenants/:id/evict')
  @Roles('warden', 'admin')
  @ApiOperation({ summary: 'Remove a tenant: frees the bed, ends the stay, writes an audit entry' })
  evict(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EvictDto,
    @Headers('x-role') role?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.evictTenant(id, { id: toId(userId), role }, body.reason);
  }

  @Get('audit-logs')
  @Roles('warden', 'admin', 'owner')
  @ApiOperation({ summary: 'Audit history (evictions, escalations, offline payments, waivers)' })
  audit(@Query('propertyId') propertyId?: string, @Query('tenantId') tenantId?: string) {
    return this.service.auditLogs({ propertyId: toId(propertyId), tenantId: toId(tenantId) });
  }
}
