import { Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATIONS, getNextId } from '../data';
import { CreateNotificationDto, UpdateNotificationDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  findAll() {
    return NOTIFICATIONS;
  }

  findOne(id: number) {
    const notification = NOTIFICATIONS.find(n => n.id === id);
    if (!notification) throw new NotFoundException(`Notification with ID ${id} not found`);
    return notification;
  }

  create(createNotificationDto: CreateNotificationDto) {
    const newNotification = {
      id: getNextId('notification'),
      ...createNotificationDto,
      sentAt: new Date().toISOString()
    };
    NOTIFICATIONS.push(newNotification);
    return newNotification;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const idx = NOTIFICATIONS.findIndex(n => n.id === id);
    if (idx === -1) throw new NotFoundException(`Notification with ID ${id} not found`);
    NOTIFICATIONS[idx] = { ...NOTIFICATIONS[idx], ...updateNotificationDto };
    return NOTIFICATIONS[idx];
  }

  remove(id: number) {
    const idx = NOTIFICATIONS.findIndex(n => n.id === id);
    if (idx === -1) throw new NotFoundException(`Notification with ID ${id} not found`);
    return NOTIFICATIONS.splice(idx, 1)[0];
  }
}
