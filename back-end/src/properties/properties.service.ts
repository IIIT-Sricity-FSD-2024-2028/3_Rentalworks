import { Injectable, NotFoundException } from '@nestjs/common';
import { PROPERTIES, getNextId } from '../data';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';

@Injectable()
export class PropertiesService {
  findAll() {
    return PROPERTIES;
  }

  findOne(id: number) {
    const property = PROPERTIES.find(p => p.id === id);
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);
    return property;
  }

  create(createPropertyDto: CreatePropertyDto) {
    const newProperty = {
      id: getNextId('property'),
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
    };
    PROPERTIES.push(newProperty);
    return newProperty;
  }

  update(id: number, updatePropertyDto: UpdatePropertyDto) {
    const idx = PROPERTIES.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Property with ID ${id} not found`);
    PROPERTIES[idx] = { ...PROPERTIES[idx], ...updatePropertyDto };
    return PROPERTIES[idx];
  }

  remove(id: number) {
    const idx = PROPERTIES.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Property with ID ${id} not found`);
    return PROPERTIES.splice(idx, 1)[0];
  }
}
