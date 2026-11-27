import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
} from './service-requests.dto';
import { requireBrowserActor } from '../users/browser-actor';

@ApiTags('service-requests')
@Controller(['service-requests', 'users/session/service-requests'])
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit new service request' })
  async create(
    @Body() createDto: CreateServiceRequestDto,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant', 'admin', 'super_admin']);
    const tenantId = actor.role === 'tenant' ? actor.id : createDto.tenantId;
    return this.serviceRequestsService.create(createDto, tenantId ?? 0);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current tenant service requests' })
  async findMy(
    @Req() request: Request,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant', 'admin', 'super_admin']);
    const tenantId = actor.role === 'tenant' || !queryTenantId ? actor.id : Number(queryTenantId);
    if (!Number.isInteger(tenantId) || tenantId <= 0 || tenantId > 2147483647) throw new BadRequestException('Invalid tenant ID');
    return this.serviceRequestsService.findMy(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all service requests with filters' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Req() request: Request,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
  ) {
    await requireBrowserActor(request, this.dataSource, ['admin', 'warden', 'owner', 'super_admin']);
    return this.serviceRequestsService.findAll(
      propertyId ? parseInt(propertyId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service request by ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant', 'admin', 'warden', 'owner', 'super_admin']);
    return this.serviceRequestsService.findOne(id, actor.id, actor.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update service request' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateServiceRequestDto,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['admin', 'warden', 'owner', 'super_admin']);
    return this.serviceRequestsService.update(id, updateDto, actor.id, actor.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel or delete service request' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    const actor = await requireBrowserActor(request, this.dataSource, ['tenant', 'admin', 'super_admin']);
    return this.serviceRequestsService.remove(id, actor.id, actor.role);
  }
}
