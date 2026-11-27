import * as fs from 'fs';
import * as path from 'path';
import { PropertyDocument } from '../property-documents/property-document.entity';
import { DOCUMENT_DIR } from '../property-documents/property-documents.service';
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
    PropertiesService.normalizeListing(createPropertyDto as any);
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
    PropertiesService.normalizeListing(cleanDto as any);
    Object.assign(property, cleanDto);
    return this.propertiesRepository.save(property);
  }

  /**
   * Keeps derived fields consistent whoever writes the property:
   *  - sharingRents (single / double / triple) → rentMin / rentMax / monthlyRent;
   *  - type ('Male' | 'Female' | 'Mixed') → gender ('boys' | 'girls' | 'unisex'),
   *    which booking eligibility checks;
   *  - custom amenities are trimmed, de-duplicated and kept short.
   */
  static normalizeListing(dto: Record<string, any>) {
    if (dto.sharingRents !== undefined) {
      const clean: Record<string, number | null> = {};
      for (const k of ['single', 'double', 'triple']) {
        const v = dto.sharingRents?.[k];
        const n = v === undefined || v === null || v === '' ? null : Number(v);
        if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1000000)) throw new BadRequestException(`Rent for ${k} sharing must be a positive amount`);
        clean[k] = n && n > 0 ? Math.round(n) : null;
      }
      const offered = Object.values(clean).filter((n): n is number => n !== null);
      if (!offered.length) throw new BadRequestException('Enter the rent for at least one room size (single, double or triple)');
      dto.sharingRents = clean;
      dto.rentMin = Math.min(...offered);
      dto.rentMax = Math.max(...offered);
      dto.monthlyRent = Math.min(...offered);
    }
    if (dto.type) {
      const t = String(dto.type).toLowerCase();
      dto.gender = t === 'male' ? 'boys' : t === 'female' ? 'girls' : 'unisex';
    }
    if (Array.isArray(dto.amenities)) {
      const seen = new Set<string>();
      dto.amenities = dto.amenities
        .map((a: unknown) => String(a ?? '').trim().replace(/\s+/g, ' ').slice(0, 40))
        .filter((a: string) => a && !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()))
        .slice(0, 30);
    }
  }

  private validateRooms(data: { totalRooms?: number; occupiedRooms?: number; monthlyRent?: number }) {
    if (data.occupiedRooms != null && data.totalRooms != null && data.occupiedRooms > data.totalRooms) throw new BadRequestException('Occupied rooms cannot exceed total rooms');
  }

  async remove(id: number) {
    const property = await this.findOne(id);
    const removed = Object.assign({}, property);
    // Document rows cascade with the property; their private files must go too.
    const docs = await this.propertiesRepository.manager
      .getRepository(PropertyDocument)
      .createQueryBuilder('d')
      .addSelect('d.filePath')
      .where('d.propertyId = :id', { id })
      .getMany();
    await this.propertiesRepository.remove(property);
    for (const d of docs) {
      const full = path.resolve(process.cwd(), d.filePath);
      if (full.startsWith(DOCUMENT_DIR) && fs.existsSync(full)) fs.unlinkSync(full);
    }
    return removed;
  }
}
