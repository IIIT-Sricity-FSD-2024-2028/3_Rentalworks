import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Notification } from '../notifications/notification.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async findAll(userId: number, role: string) {
    const query = this.complaintsRepository.createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.tenant', 'tenant')
      .leftJoinAndSelect('complaint.property', 'property');

    if (role === 'tenant') {
      query.andWhere('complaint.tenantId = :userId', { userId });
    } else if (role === 'warden') {
      const warden = await this.usersRepository.findOne({ where: { id: userId } });
      if (warden?.assignedPropertyId) {
        query.andWhere('complaint.propertyId = :propertyId', { propertyId: warden.assignedPropertyId });
      } else {
        query.andWhere('1 = 0'); // No property assigned
      }
    } else if (role === 'owner') {
      query.andWhere('property.ownerId = :userId', { userId });
      // Owners only see escalated or resolved issues, or maybe all. Let's say all for their properties.
    } else if (role !== 'admin' && role !== 'super_admin') {
       query.andWhere('1 = 0');
    }

    return query.getMany();
  }

  async findOne(id: number, userId: number, role: string) {
    const complaint = await this.complaintsRepository.findOne({ where: { id }, relations: { tenant: true, property: { owner: true } } });
    if (!complaint) throw new NotFoundException(`Complaint with ID ${id} not found`);

    if (role === 'tenant' && complaint.tenantId !== userId) throw new ForbiddenException();
    if (role === 'warden') {
      const warden = await this.usersRepository.findOne({ where: { id: userId } });
      if (complaint.propertyId !== warden?.assignedPropertyId) throw new ForbiddenException();
    }
    if (role === 'owner' && complaint.property.ownerId !== userId) throw new ForbiddenException();

    return complaint;
  }

  async create(createComplaintDto: CreateComplaintDto, userId: number) {
    const newComplaint = this.complaintsRepository.create({
      ...createComplaintDto,
      tenantId: userId, // enforce tenant creating their own
      status: 'pending',
      reportedAt: new Date().toISOString().split('T')[0]
    });
    const saved = await this.complaintsRepository.save(newComplaint);

    // Notify Warden
    const wardens = await this.usersRepository.find({ where: { role: 'warden', assignedPropertyId: saved.propertyId } });
    for (const w of wardens) {
      await this.notificationsRepository.save({
        title: 'New Complaint',
        message: `New issue reported in property by tenant ${userId}.`,
        type: 'complaint', priority: 'normal', recipients: 1, sentAt: new Date().toISOString(), byUserId: userId, userId: w.id
      });
    }

    return saved;
  }

  async update(id: number, updateComplaintDto: UpdateComplaintDto, userId: number, role: string) {
    const complaint = await this.findOne(id, userId, role);
    const oldStatus = complaint.status;
    const cleanDto = Object.fromEntries(Object.entries(updateComplaintDto).filter(([_, v]) => v !== undefined));
    Object.assign(complaint, cleanDto);
    
    const saved = await this.complaintsRepository.save(complaint);

    if (oldStatus !== saved.status) {
       // Notify Tenant
       await this.notificationsRepository.save({
         title: 'Complaint Updated',
         message: `Your complaint status changed to ${saved.status}.`,
         type: 'update', priority: 'normal', recipients: 1, sentAt: new Date().toISOString(), byUserId: userId, userId: complaint.tenantId
       });

       // Escalation logic
       if (saved.status === 'escalated') {
         // Notify Owner
         await this.notificationsRepository.save({
           title: 'Complaint Escalated',
           message: `A complaint was escalated by the warden in property ${complaint.propertyId}.`,
           type: 'alert', priority: 'urgent', recipients: 1, sentAt: new Date().toISOString(), byUserId: userId, userId: complaint.property.ownerId
         });
       }

       if (saved.status === 'resolved' && role === 'owner') {
          // Notify Warden that owner resolved it
          const wardens = await this.usersRepository.find({ where: { role: 'warden', assignedPropertyId: saved.propertyId } });
          for (const w of wardens) {
            await this.notificationsRepository.save({
              title: 'Escalated Complaint Resolved',
              message: `The owner has resolved an escalated complaint.`,
              type: 'update', priority: 'normal', recipients: 1, sentAt: new Date().toISOString(), byUserId: userId, userId: w.id
            });
          }
       }
    }
    return saved;
  }

  async remove(id: number, userId: number, role: string) {
    const complaint = await this.findOne(id, userId, role);
    const removed = { ...complaint };
    await this.complaintsRepository.remove(complaint);
    return removed;
  }
}
