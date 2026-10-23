import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WardenNotification } from './warden-notification.entity';
import {
  CreateWardenNotificationDto,
  UpdateWardenNotificationDto,
} from './warden-notifications.dto';

@Injectable()
export class WardenNotificationsService {
  constructor(
    @InjectRepository(WardenNotification)
    private readonly repo: Repository<WardenNotification>,
  ) {}

  findAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException(`Warden Notification ${id} not found`);
    return notif;
  }

  create(dto: CreateWardenNotificationDto) {
    const notif = this.repo.create({
      ...dto,
      read: false,
    });
    return this.repo.save(notif);
  }

  async update(id: number, dto: UpdateWardenNotificationDto) {
    const notif = await this.findOne(id);
    Object.assign(notif, dto);
    return this.repo.save(notif);
  }

  async markAsRead(id: number) {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) {
      return { success: true, id, message: `Notification ${id} not found` };
    }
    notif.read = true;
    return this.repo.save(notif);
  }

  async markAllAsRead() {
    await this.repo
      .createQueryBuilder()
      .update(WardenNotification)
      .set({ read: true })
      .execute();
    return { success: true, message: 'All notifications marked as read' };
  }

  async remove(id: number) {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) {
      return { success: true, id, message: `Notification ${id} not found` };
    }
    await this.repo.remove(notif);
    return { success: true, id };
  }
}
