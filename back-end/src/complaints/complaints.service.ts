import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { WardenNotificationsService } from '../warden-notifications/warden-notifications.service';

import { Notification } from '../notifications/notification.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private wardenNotificationsService: WardenNotificationsService,
  ) { }

  findAll(tenantId?: number, propertyId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (propertyId) where.propertyId = propertyId;

    return this.complaintsRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
      order: { id: 'DESC' },
    });
  }

  findByOwner(ownerId: number) {
    return this.complaintsRepository.createQueryBuilder('complaint')
      .innerJoinAndSelect('complaint.property', 'property')
      .leftJoinAndSelect('complaint.tenant', 'tenant')
      .where('property.ownerId = :ownerId', { ownerId })
      .orderBy('complaint.id', 'DESC')
      .getMany();
  }

  async findOne(id: number) {
    const complaint = await this.complaintsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });
    if (!complaint)
      throw new NotFoundException(`Complaint with ID ${id} not found`);
    return complaint;
  }

  async create(createComplaintDto: CreateComplaintDto) {
    const defaults = {
      status: 'open',
      priority: createComplaintDto.priority || 'medium',
      category: createComplaintDto.category || 'general',
      reportedAt: new Date().toISOString().split('T')[0],
    };
    const payload = Object.assign({}, defaults, createComplaintDto);
    const newComplaint = this.complaintsRepository.create(payload);
    const saved = await this.complaintsRepository.save(newComplaint);

    // Workflow: Notify Warden in the separate warden_notifications table
    try {
      let tenantName = 'Tenant';
      let senderRole = 'tenant';
      let propertyName = 'PG Property';
      let roomNumber = '101';

      if (saved.tenantId) {
        const u = await this.userRepository.findOne({ where: { id: saved.tenantId } });
        if (u) {
          tenantName = u.name;
          senderRole = u.role;
        }
      }

      if (saved.propertyId) {
        const p = await this.propertyRepository.findOne({ where: { id: saved.propertyId } });
        if (p) propertyName = p.name;

        const r = await this.roomRepository.findOne({ where: { propertyId: saved.propertyId } });
        if (r) roomNumber = r.roomNumber;
      }

      await this.wardenNotificationsService.create({
        title: `Issue: ${saved.title || 'Complaint Reported'}`,
        message: saved.description,
        type: 'issue',
        priority: saved.priority || 'medium',
        senderName: tenantName,
        senderRole,
        propertyName: propertyName,
        roomNumber: roomNumber,
        tenantId: saved.tenantId,
        propertyId: saved.propertyId,
        sourceReferenceId: saved.id,
      });

      // Also notify property owner directly
      if (saved.propertyId) {
        const prop = await this.propertyRepository.findOne({ where: { id: saved.propertyId } });
        if (prop && prop.ownerId) {
          const ownerNotif = this.notificationRepository.create({
            title: `Issue Reported: ${saved.title || 'Complaint'} at ${propertyName}`,
            message: `${tenantName} reported: ${saved.description}`,
            type: 'issue',
            priority: saved.priority || 'medium',
            userId: prop.ownerId,
            targetRole: 'owner',
            targetPropertyId: saved.propertyId,
            byUserId: saved.tenantId,
            sentAt: new Date().toISOString(),
            read: false,
            isRead: false,
            deliveryStatus: 'sent',
          });
          await this.notificationRepository.save(ownerNotif);
        }
      }
    } catch (notifErr) {
      console.warn('Could not post auto-notification:', notifErr);
    }

    return saved;
  }

  async update(id: number, updateComplaintDto: UpdateComplaintDto) {
    const complaint = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateComplaintDto).filter(([_, v]) => v !== undefined),
    );
    if (cleanDto.status === 'resolved' && !cleanDto.resolvedAt) {
      cleanDto.resolvedAt = new Date().toISOString().split('T')[0];
    }
    Object.assign(complaint, cleanDto);
    return this.complaintsRepository.save(complaint);
  }

  async remove(id: number) {
    const complaint = await this.findOne(id);
    const removed = Object.assign({}, complaint);
    await this.complaintsRepository.remove(complaint);
    return removed;
  }
}
