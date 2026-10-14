import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './notification.entity';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) { }

  findAll(userId?: number) {
    if (userId) {
      return this.notificationsRepository.find({
        where: [{ userId }, { userId: IsNull() }],
        relations: { byUser: true, user: true },
        order: { id: 'DESC' },
      });
    }
    return this.notificationsRepository.find({
      relations: { byUser: true, user: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: { byUser: true, user: true },
    });
    if (!notification)
      throw new NotFoundException(`Notification with ID ${id} not found`);
    return notification;
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const defaults = {
      read: false,
      isRead: false,
      sentAt: new Date().toISOString().split('T')[0],
    };
    const payload = Object.assign({}, defaults, createNotificationDto);
    const newNotification = this.notificationsRepository.create(payload);
    return this.notificationsRepository.save(newNotification);
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const notification = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateNotificationDto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(notification, cleanDto);
    return this.notificationsRepository.save(notification);
  }

  async markAsRead(id: number) {
    const notification = await this.findOne(id);
    notification.read = true;
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markRead(id: number) {
    return this.markAsRead(id);
  }

  async markAllAsRead(userId?: number) {
    const qb = this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, isRead: true });
    if (userId) {
      qb.where('"userId" = :userId OR "userId" IS NULL', { userId });
    }
    await qb.execute();
    return { success: true, message: 'All notifications marked as read' };
  }

  async markAllRead() {
    return this.markAllAsRead();
  }

  async remove(id: number) {
    const notification = await this.findOne(id);
    const removed = Object.assign({}, notification);
    await this.notificationsRepository.remove(notification);
    return removed;
  }
}
