import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('services')
@Controller('services')
@UseGuards(RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get all available services' })
  @ApiQuery({ name: 'propertyId', required: false })
  async findAll(@Query('propertyId') propertyId?: string) {
    return this.servicesService.findAll(propertyId ? +propertyId : undefined);
  }

  @Get(':id')
  @Roles('tenant', 'admin', 'warden', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get service by ID' })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Create new catalog service' })
  async create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Patch(':id')
  @Roles('admin', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Update catalog service' })
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(+id, updateServiceDto);
  }

  @Delete(':id')
  @Roles('admin', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Delete catalog service' })
  async remove(@Param('id') id: string) {
    return this.servicesService.remove(+id);
  }
}
