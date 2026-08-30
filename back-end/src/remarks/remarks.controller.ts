import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RemarksService } from './remarks.service';
import { CreateRemarkDto } from './remarks.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('remarks')
@Controller('remarks')
@UseGuards(RolesGuard)
export class RemarksController {
  constructor(private readonly remarksService: RemarksService) {}

  @Get('complaint/:id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get remarks for a specific complaint' })
  findByComplaint(@Param('id') id: string) {
    return this.remarksService.findByComplaint(+id);
  }

  @Post()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Create new remark' })
  create(@Body() createRemarkDto: CreateRemarkDto) {
    return this.remarksService.create(createRemarkDto);
  }
}
