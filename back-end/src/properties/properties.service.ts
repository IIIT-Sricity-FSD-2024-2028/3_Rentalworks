import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
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
    const cleanDto = Object.fromEntries(Object.entries(updatePropertyDto).filter(([_, v]) => v !== undefined));
    Object.assign(property, cleanDto);
    return this.propertiesRepository.save(property);
  }

  async remove(id: number) {
    const property = await this.findOne(id);
    const removed = { ...property };
    await this.propertiesRepository.remove(property);
    return removed;
  }
}
