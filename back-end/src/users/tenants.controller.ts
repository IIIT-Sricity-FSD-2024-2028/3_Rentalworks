import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateTenantDto, UpdateTenantDto } from './users.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Get all tenants with bookings, rooms and payments' })
  findAll() {
    return this.usersService.getTenants();
  }

  @Post()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Add a new tenant and create linked records' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.usersService.createTenant(createTenantDto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update tenant and linked records' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.usersService.updateTenant(+id, updateTenantDto);
  }

  @Delete(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Delete tenant and associated records' })
  remove(@Param('id') id: string) {
    return this.usersService.removeTenant(+id);
  }
}
