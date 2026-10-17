import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
  ) { }

  findAll(locationOrOwnerId?: string | number, ownerId?: number) {
    let location: string | undefined;
    let resolvedOwnerId: number | undefined = ownerId;

    if (typeof locationOrOwnerId === 'number') {
      resolvedOwnerId = locationOrOwnerId;
    } else if (typeof locationOrOwnerId === 'string') {
      location = locationOrOwnerId;
    }

    const query = this.propertiesRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.owner', 'owner')
      .leftJoinAndSelect('property.roomEntities', 'rooms');

    if (location) {
      query.andWhere('LOWER(property.location) LIKE LOWER(:location)', {
        location: `%${location}%`,
      });
    }

    if (resolvedOwnerId) {
      query.andWhere('property.ownerId = :ownerId', { ownerId: resolvedOwnerId });
    }

    return query.getMany();
  }

  async findOne(id: number) {
    const property = await this.propertiesRepository.findOne({
      where: { id },
      relations: { owner: true, roomEntities: true },
    });
    if (!property)
      throw new NotFoundException(`Property with ID ${id} not found`);
    return property;
  }

  async create(createPropertyDto: CreatePropertyDto) {
    this.validateRooms(createPropertyDto);
    const defaults = {
      occupancy: 0,
      safetyScore: 8.5,
      status: 'approved',
      docsVerified: true,
      inspectionPassed: true,
      commissionRate: 10,
      compliance: 'Verified',
      fireSafety: 'Yes',
      changeRequestPending: false,
      gender: createPropertyDto.gender || 'unisex',
      rules: createPropertyDto.rules || [],
      images: createPropertyDto.images || [],
    };
    const payload = Object.assign({}, defaults, createPropertyDto);
    const newProperty = this.propertiesRepository.create(payload);
    return this.propertiesRepository.save(newProperty);
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto) {
    const property = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updatePropertyDto).filter(([_, v]) => v !== undefined),
    );
    this.validateRooms(Object.assign({}, property, cleanDto));
    Object.assign(property, cleanDto);
    return this.propertiesRepository.save(property);
  }

  private validateRooms(data: { totalRooms?: number; occupiedRooms?: number; monthlyRent?: number }) {
    if (data.occupiedRooms != null && data.totalRooms != null && data.occupiedRooms > data.totalRooms) throw new BadRequestException('Occupied rooms cannot exceed total rooms');
  }

  async remove(id: number) {
    const property = await this.findOne(id);
    const removed = Object.assign({}, property);
    await this.propertiesRepository.remove(property);
    return removed;
  }
}
