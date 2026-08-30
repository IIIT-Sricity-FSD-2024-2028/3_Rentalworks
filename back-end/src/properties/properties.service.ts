import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';
import { Notification } from '../notifications/notification.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  findAll() {
    return this.propertiesRepository.find({ relations: { owner: true } });
  }

  async findOne(id: number) {
    const property = await this.propertiesRepository.findOne({ where: { id }, relations: { owner: true } });
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);
    return property;
  }

  async create(createPropertyDto: CreatePropertyDto) {
    const newProperty = this.propertiesRepository.create({
      ...createPropertyDto,
      occupancy: 0,
      safetyScore: 8.0,
      status: 'pending',
      docsVerified: false,
      inspectionPassed: false,
      commissionRate: 10,
      compliance: 'Pending',
      fireSafety: 'Pending',
      changeRequestPending: false
    });
    return this.propertiesRepository.save(newProperty);
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto) {
    const property = await this.findOne(id);
    const oldStatus = property.status;
    const cleanDto = Object.fromEntries(Object.entries(updatePropertyDto).filter(([_, v]) => v !== undefined));
    Object.assign(property, cleanDto);
    
    const saved = await this.propertiesRepository.save(property);

    if (oldStatus !== saved.status && property.ownerId) {
       let msg = '';
       let type = 'info';
       if (saved.status === 'active') {
         msg = `Your property "${saved.name}" has been approved and is now active.`;
         type = 'success';
       } else if (saved.status === 'rejected') {
         msg = `Your property "${saved.name}" has been rejected.`;
         type = 'alert';
       }

       if (msg) {
         await this.notificationsRepository.save({
           title: 'Property Status Update',
           message: msg,
           type: type,
           priority: 'high',
           recipients: 1, // 1 user
           userId: property.ownerId,
           sentAt: new Date().toISOString()
         });
       }
    }

    return saved;
  }

  async remove(id: number) {
    const property = await this.findOne(id);
    const removed = { ...property };
    await this.propertiesRepository.remove(property);
    return removed;
  }
}
