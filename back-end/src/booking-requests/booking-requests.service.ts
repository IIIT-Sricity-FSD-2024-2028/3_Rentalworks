import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingRequest } from './booking-request.entity';
import {
  CreateBookingRequestDto,
  UpdateBookingRequestDto,
} from './booking-requests.dto';

@Injectable()
export class BookingRequestsService {
  constructor(
    @InjectRepository(BookingRequest)
    private bookingRequestsRepository: Repository<BookingRequest>,
  ) {}

  findAll(tenantId?: number, propertyId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (propertyId) where.propertyId = propertyId;

    return this.bookingRequestsRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
    });
  }

  async findOne(id: number) {
    const request = await this.bookingRequestsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });
    if (!request)
      throw new NotFoundException(`Booking request with ID ${id} not found`);
    return request;
  }

  async create(createDto: CreateBookingRequestDto) {
    const newRequest = this.bookingRequestsRepository.create({
      ...createDto,
      status: 'pending',
    });
    return this.bookingRequestsRepository.save(newRequest);
  }

  async update(id: number, updateDto: UpdateBookingRequestDto) {
    const request = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateDto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(request, cleanDto);
    return this.bookingRequestsRepository.save(request);
  }

  async remove(id: number) {
    const request = await this.findOne(id);
    const removed = { ...request };
    await this.bookingRequestsRepository.remove(request);
    return removed;
  }
}
