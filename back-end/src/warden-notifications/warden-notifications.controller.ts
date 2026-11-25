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
import { WardenNotificationsService } from './warden-notifications.service';
import {
  CreateWardenNotificationDto,
  UpdateWardenNotificationDto,
} from './warden-notifications.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('warden-notifications')
@Controller('warden-notifications')
@UseGuards(RolesGuard)
export class WardenNotificationsController {
  constructor(
    private readonly wardenNotificationsService: WardenNotificationsService,
  ) {}

  @Get()
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Get all warden notifications' })
  findAll() {
    return this.wardenNotificationsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Get warden notification by ID' })
  findOne(@Param('id') id: string) {
    return this.wardenNotificationsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'warden', 'owner', 'tenant')
  @ApiOperation({ summary: 'Create new warden notification (e.g. from owner or tenant issue)' })
  create(@Body() dto: CreateWardenNotificationDto) {
    return this.wardenNotificationsService.create(dto);
  }

  @Put('mark-all-read')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Mark all warden notifications as read' })
  markAllAsRead() {
    return this.wardenNotificationsService.markAllAsRead();
  }

  @Put(':id/read')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Mark single warden notification as read' })
  markAsRead(@Param('id') id: string) {
    return this.wardenNotificationsService.markAsRead(+id);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update warden notification' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWardenNotificationDto,
  ) {
    return this.wardenNotificationsService.update(+id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Delete warden notification' })
  remove(@Param('id') id: string) {
    return this.wardenNotificationsService.remove(+id);
  }
}
