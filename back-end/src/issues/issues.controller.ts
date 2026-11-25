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
import { IssuesService } from './issues.service';
import { CreateIssueDto, UpdateIssueDto } from './issues.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('issues')
@Controller('issues')
@UseGuards(RolesGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create new issue' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Tenant user ID' })
  async create(
    @Body() createIssueDto: CreateIssueDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const tenantId = headerUserId ? parseInt(headerUserId, 10) : createIssueDto.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('x-user-id header or tenantId body field is required');
    }
    return this.issuesService.create(createIssueDto, tenantId);
  }

  @Get('my')
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get current tenant issues' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Tenant user ID' })
  async findMy(
    @Headers('x-user-id') headerUserId?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = headerUserId ? parseInt(headerUserId, 10) : queryTenantId ? parseInt(queryTenantId, 10) : null;
    if (!tenantId) {
      throw new UnauthorizedException('x-user-id header or tenantId query is required');
    }
    return this.issuesService.findMy(tenantId);
  }

  @Get()
  @Roles('admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get all issues with filters' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
  ) {
    return this.issuesService.findAll(
      propertyId ? parseInt(propertyId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get issue by ID' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.issuesService.findOne(+id, currentUserId, headerRole);
  }

  @Patch(':id')
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Update issue by ID' })
  async update(
    @Param('id') id: string,
    @Body() updateIssueDto: UpdateIssueDto,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.issuesService.update(+id, updateIssueDto, currentUserId, headerRole);
  }

  @Delete(':id')
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Delete or cancel issue by ID' })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-role') headerRole?: string,
  ) {
    const currentUserId = headerUserId ? parseInt(headerUserId, 10) : undefined;
    return this.issuesService.remove(+id, currentUserId, headerRole);
  }
}
