import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './notifications.dto';

import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
  ) {}

  findAll() {
    return this.notificationsRepository.find({ relations: { byUser: true } });
  }

  async findOne(id: number) {
<<<<<<< HEAD
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: { byUser: true },
    });
    if (!notification)
      throw new NotFoundException(`Notification with ID ${id} not found`);
=======
    const notification = await this.notificationsRepository.findOne({ where: { id }, relations: { byUser: true, recipient: true } });
    if (!notification) throw new NotFoundException(`Notification with ID ${id} not found`);
>>>>>>> bb460233e4a02a259714c6eefceba8397348038a
    return notification;
  }

  findByUser(userId: number) {
    return this.notificationsRepository.find({
      where: { recipientId: userId },
      relations: { byUser: true },
      order: { sentAt: 'DESC' }
    });
  }

  async markAsRead(userId: number) {
    await this.notificationsRepository.update({ recipientId: userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const newNotification = this.notificationsRepository.create({
      ...createNotificationDto,
      sentAt: new Date().toISOString(),
    });
    return this.notificationsRepository.save(newNotification);
  }

  async sendToWarden(ownerId: number, createNotificationDto: CreateNotificationDto) {
    const property = await this.propertiesRepository.findOne({ where: { ownerId: ownerId } });
    if (!property) throw new NotFoundException('Owner has no property');
    const warden = await this.usersRepository.findOne({ where: { propertyId: property.id, role: 'warden' } });
    if (!warden) throw new NotFoundException('Property has no assigned warden');

    const newNotification = this.notificationsRepository.create({
      ...createNotificationDto,
      sentAt: new Date().toISOString(),
      recipientId: warden.id,
      byUserId: ownerId
    });
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

  async remove(id: number) {
    const notification = await this.findOne(id);
    const removed = { ...notification };
    await this.notificationsRepository.remove(notification);
    return removed;
  }
}
