import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { WardenNotificationsService } from '../warden-notifications/warden-notifications.service';

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
    private wardenNotificationsService: WardenNotificationsService,
  ) {}

  findAll() {
    return this.complaintsRepository.find({
      relations: { tenant: true, property: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const complaint = await this.complaintsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true },
    });
    if (!complaint)
      throw new NotFoundException(`Complaint with ID ${id} not found`);
    return complaint;
  }

  async create(createComplaintDto: CreateComplaintDto) {
    const defaults = {
      status: 'open',
      reportedAt: new Date().toISOString().split('T')[0],
    };
    const payload = Object.assign({}, defaults, createComplaintDto);
    const newComplaint = this.complaintsRepository.create(payload);
    const saved = await this.complaintsRepository.save(newComplaint);

    // Workflow: Notify Warden in the separate warden_notifications table
    try {
      let tenantName = 'Tenant';
      let propertyName = 'PG Property';
      let roomNumber = '101';

      if (saved.tenantId) {
        const u = await this.userRepository.findOne({ where: { id: saved.tenantId } });
        if (u) tenantName = u.name;
      }

      if (saved.propertyId) {
        const p = await this.propertyRepository.findOne({ where: { id: saved.propertyId } });
        if (p) propertyName = p.name;

        const r = await this.roomRepository.findOne({ where: { propertyId: saved.propertyId } });
        if (r) roomNumber = r.roomNumber;
      }

      await this.wardenNotificationsService.create({
        title: `Tenant Issue: ${saved.title || 'Complaint Reported'}`,
        message: saved.description,
        type: 'issue',
        priority: saved.priority || 'medium',
        senderName: tenantName,
        senderRole: 'tenant',
        propertyName: propertyName,
        roomNumber: roomNumber,
        tenantId: saved.tenantId,
        propertyId: saved.propertyId,
        sourceReferenceId: saved.id,
      });
    } catch (notifErr) {
      console.warn('Could not post auto-notification to warden_notifications:', notifErr);
    }

    return saved;
  }

  async update(id: number, updateComplaintDto: UpdateComplaintDto) {
    const complaint = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateComplaintDto).filter(([_, v]) => v !== undefined),
    );
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
