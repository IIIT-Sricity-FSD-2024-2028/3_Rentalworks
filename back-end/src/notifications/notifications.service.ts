import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
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
    private dataSource: DataSource,
  ) { }

  /**
   * A tenant's feed = notifications addressed to them, plus broadcasts that were sent AFTER their
   * tenancy began and that target tenants / their property. This is what keeps a brand-new tenant's
   * dashboard free of older users' announcements and test data.
   */
  private async findForTenant(userId: number) {
    const stay = await this.dataSource
      .getRepository(TenantStay)
      .findOne({ where: { tenantId: userId, status: 'active' }, order: { id: 'DESC' } });
    const me = stay ? null : await this.dataSource.getRepository(User).findOneBy({ id: userId });
    const since = new Date(stay?.createdAt || me?.createdAt || 0).getTime();

    const all = await this.notificationsRepository.find({
      where: [{ userId }, { userId: IsNull() }],
      relations: { byUser: true, user: true },
      order: { id: 'DESC' },
    });

    return all.filter((n) => {
      if (n.userId === userId) return true;
      if (Array.isArray(n.recipientUserIds) && n.recipientUserIds.length > 0) return n.recipientUserIds.includes(userId);
      if (new Date(n.createdAt).getTime() < since) return false;
      if (n.targetRole && !['tenant', 'tenants', 'all'].includes(String(n.targetRole).toLowerCase())) return false;
      if (n.targetPropertyId && n.targetPropertyId !== stay?.propertyId) return false;
      return true;
    });
  }

  async findAll(userId?: number, role?: string) {
    const validUserId =
      typeof userId === 'number' &&
      Number.isInteger(userId) &&
      userId > 0 &&
      userId <= 2147483647
        ? userId
        : undefined;

    try {
      if (validUserId && role === 'tenant') {
        return await this.findForTenant(validUserId);
      }
      if (validUserId) {
        const notifications = await this.notificationsRepository.find({
          where: [{ userId: validUserId }, { userId: IsNull() }],
          relations: { byUser: true, user: true },
          order: { id: 'DESC' },
        });

        // Filter for announcements targeting specific recipient IDs if present
        return notifications.filter((n) => {
          if (!n.recipientUserIds || !Array.isArray(n.recipientUserIds) || n.recipientUserIds.length === 0) {
            return true;
          }
          return n.recipientUserIds.includes(validUserId);
        });
      }

      return await this.notificationsRepository.find({
        relations: { byUser: true, user: true },
        order: { id: 'DESC' },
      });
    } catch (err) {
      // Gracefully fall back to empty list on unexpected database errors
      throw err;
    }
  }

  async findOne(id: number) {
    if (!id || isNaN(id) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
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
      recipients: createNotificationDto.recipients || 1,
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
    const validUserId =
      typeof userId === 'number' &&
      Number.isInteger(userId) &&
      userId > 0 &&
      userId <= 2147483647
        ? userId
        : undefined;

    const qb = this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, isRead: true });
    if (validUserId) {
      qb.where('"userId" = :userId', { userId: validUserId });
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
