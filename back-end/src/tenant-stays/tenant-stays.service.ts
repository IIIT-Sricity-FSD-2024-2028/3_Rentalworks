import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantStay } from './tenant-stay.entity';
import { CreateTenantStayDto, UpdateTenantStayDto } from './tenant-stays.dto';

@Injectable()
export class TenantStaysService {
  constructor(
    @InjectRepository(TenantStay)
    private tenantStaysRepository: Repository<TenantStay>,
  ) {}

  findAll(tenantId?: number, propertyId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (propertyId) where.propertyId = propertyId;

    return this.tenantStaysRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
    });
  }

  async findOne(id: number) {
    const stay = await this.tenantStaysRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });
    if (!stay) throw new NotFoundException(`Tenant stay with ID ${id} not found`);
    return stay;
  }

  async create(createDto: CreateTenantStayDto) {
    const newStay = this.tenantStaysRepository.create({
      ...createDto,
      status: createDto.status || 'active',
    });
    return this.tenantStaysRepository.save(newStay);
  }

  async update(id: number, updateDto: UpdateTenantStayDto) {
    const stay = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateDto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(stay, cleanDto);
    return this.tenantStaysRepository.save(stay);
  }

  async remove(id: number) {
    const stay = await this.findOne(id);
    const removed = { ...stay };
    await this.tenantStaysRepository.remove(stay);
    return removed;
  }
}
