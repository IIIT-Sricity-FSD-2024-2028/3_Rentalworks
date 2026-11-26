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
import { TenantStaysService } from './tenant-stays.service';
import { CreateTenantStayDto, UpdateTenantStayDto } from './tenant-stays.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataSource } from 'typeorm';
import { AuthUser, assertCanSee, scopeRows } from '../common/crud';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('tenant-stays')
@Controller('tenant-stays')
@UseGuards(RolesGuard)
export class TenantStaysController {
  constructor(private readonly tenantStaysService: TenantStaysService, private readonly db: DataSource) {}

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all tenant stays' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  async findAll(
    @Req() req: { user: AuthUser },
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    // Owners see stays in their properties; tenants their own.
    return scopeRows(this.db, req.user, await this.tenantStaysService.findAll(
      tenantId ? +tenantId : undefined,
      propertyId ? +propertyId : undefined,
    ));
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get tenant stay by ID' })
  async findOne(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const row = await this.tenantStaysService.findOne(+id);
    await assertCanSee(this.db, req.user, row);
    return row;
  }

  @Post()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Create new tenant stay' })
  create(@Body() createDto: CreateTenantStayDto) {
    return this.tenantStaysService.create(createDto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update tenant stay status' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTenantStayDto) {
    return this.tenantStaysService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete tenant stay' })
  remove(@Param('id') id: string) {
    return this.tenantStaysService.remove(+id);
  }
}
