import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { CreateNotificationDto, UpdateNotificationDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  findAll() {
    return this.notificationsRepository.find({ relations: { byUser: true } });
  }

  async findOne(id: number) {
    const notification = await this.notificationsRepository.findOne({ where: { id }, relations: { byUser: true } });
    if (!notification) throw new NotFoundException(`Notification with ID ${id} not found`);
    return notification;
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const newNotification = this.notificationsRepository.create({
      ...createNotificationDto,
      sentAt: new Date().toISOString()
    });
    return this.notificationsRepository.save(newNotification);
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const notification = await this.findOne(id);
    const cleanDto = Object.fromEntries(Object.entries(updateNotificationDto).filter(([_, v]) => v !== undefined));
    Object.assign(notification, cleanDto);
    return this.notificationsRepository.save(notification);
  }

  async remove(id: number) {
    const notification = await this.findOne(id);
    const removed = { ...notification };
    await this.notificationsRepository.remove(notification);
    return removed;
  }
}
