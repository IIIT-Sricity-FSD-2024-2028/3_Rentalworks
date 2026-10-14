import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
} from './service-requests.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('service-requests')
@Controller('service-requests')
@UseGuards(RolesGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post()
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Submit new service request' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Tenant user ID' })
  async create(
    @Body() createDto: CreateServiceRequestDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const tenantId = headerUserId ? parseInt(headerUserId, 10) : createDto.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('x-user-id header or tenantId body field is required');
    }
    return this.serviceRequestsService.create(createDto, tenantId);
  }

  @Get('my')
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get current tenant service requests' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Tenant user ID' })
  async findMy(
    @Headers('x-user-id') headerUserId?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = headerUserId ? parseInt(headerUserId, 10) : queryTenantId ? parseInt(queryTenantId, 10) : null;
    if (!tenantId) {
      throw new UnauthorizedException('x-user-id header or tenantId query is required');
    }
    return this.serviceRequestsService.findMy(tenantId);
  }

  @Get()
  @Roles('admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get all service requests with filters' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
  ) {
    return this.serviceRequestsService.findAll(
      propertyId ? parseInt(propertyId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get service request by ID' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.serviceRequestsService.findOne(+id, currentUserId, headerRole);
  }

  @Patch(':id')
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Update service request' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestDto,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.serviceRequestsService.update(+id, updateDto, currentUserId, headerRole);
  }

  @Delete(':id')
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Cancel or delete service request' })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.serviceRequestsService.remove(+id, currentUserId, headerRole);
  }
}
