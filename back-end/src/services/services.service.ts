import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './service.entity';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async findAll(propertyId?: number): Promise<Service[]> {
    const where: any = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }
    return this.servicesRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return service;
  }

  async create(createDto: CreateServiceDto): Promise<Service> {
    const service = this.servicesRepository.create(createDto);
    return this.servicesRepository.save(service);
  }

  async update(id: number, updateDto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);
    Object.assign(service, updateDto);
    return this.servicesRepository.save(service);
  }

  async remove(id: number): Promise<Service> {
    const service = await this.findOne(id);
    const clone = { ...service };
    await this.servicesRepository.remove(service);
    return clone;
  }
}
