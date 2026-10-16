import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './notifications.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiQuery({ name: 'userId', required: false })
  findAll(
    @Query('userId') userId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const rawId = userId || headerUserId;
    const num = rawId ? Number(rawId) : NaN;
    const parsedId =
      !isNaN(num) && Number.isInteger(num) && num > 0 && num <= 2147483647
        ? num
        : undefined;
    return this.notificationsService.findAll(parsedId);
  }

  @Put('read-all')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Mark all notifications as read (PUT)' })
  markAllAsReadPut(@Headers('x-user-id') headerUserId?: string) {
    const num = headerUserId ? Number(headerUserId) : NaN;
    const parsedId =
      !isNaN(num) && Number.isInteger(num) && num > 0 && num <= 2147483647
        ? num
        : undefined;
    return this.notificationsService.markAllAsRead(parsedId);
  }

  @Patch('read-all')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Mark all notifications as read (PATCH)' })
  markAllAsRead(@Headers('x-user-id') headerUserId?: string) {
    const num = headerUserId ? Number(headerUserId) : NaN;
    const parsedId =
      !isNaN(num) && Number.isInteger(num) && num > 0 && num <= 2147483647
        ? num
        : undefined;
    return this.notificationsService.markAllAsRead(parsedId);
  }

  @Put(':id/read')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Mark a notification as read (PUT)' })
  markAsReadPut(@Param('id') id: string) {
    return this.notificationsService.markAsRead(+id);
  }

  @Patch(':id/read')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Mark a notification as read (PATCH)' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(+id);
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get notification by ID' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Create new notification' })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Put('mark-all-read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Put(':id/read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(+id);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update a notification' })
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Delete a notification' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
