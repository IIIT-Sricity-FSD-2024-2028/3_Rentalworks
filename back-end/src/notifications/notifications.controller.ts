import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './notifications.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all notifications' })
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get notification by ID' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Get('user/:userId')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get notifications for a user' })
  findByUser(@Param('userId') userId: string, @Req() req: any) {
    if (req.user?.role !== 'admin' && Number(req.user?.id) !== Number(userId)) {
      throw new ForbiddenException('You can only access your own notifications');
    }
    return this.notificationsService.findByUser(+userId);
  }

  @Post('user/:userId/read')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Mark all notifications for a user as read' })
  markAsRead(@Param('userId') userId: string, @Req() req: any) {
    if (req.user?.role !== 'admin' && Number(req.user?.id) !== Number(userId)) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }
    return this.notificationsService.markAsRead(+userId);
  }

  @Post('owner-to-warden')
  @Roles('owner')
  @ApiOperation({ summary: 'Send notification to property warden' })
  sendToWarden(@Body() createNotificationDto: CreateNotificationDto, @Body('ownerId') ownerId: number, @Req() req: any) {
    if (Number(req.user?.id) !== Number(ownerId)) {
      throw new ForbiddenException('You can only send notifications on your own behalf');
    }
    return this.notificationsService.sendToWarden(+ownerId, createNotificationDto);
  }

  @Post()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Create new notification' })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update a notification' })
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationsService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a notification' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
