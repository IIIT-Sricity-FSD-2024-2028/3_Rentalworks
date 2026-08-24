import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
  ) {}

  findAll() {
    return this.complaintsRepository.find({ relations: { tenant: true, property: true } });
  }

  async findOne(id: number) {
    const complaint = await this.complaintsRepository.findOne({ where: { id }, relations: { tenant: true, property: true } });
    if (!complaint) throw new NotFoundException(`Complaint with ID ${id} not found`);
    return complaint;
  }

  async create(createComplaintDto: CreateComplaintDto) {
    const newComplaint = this.complaintsRepository.create({
      ...createComplaintDto,
      status: 'open',
      reportedAt: new Date().toISOString().split('T')[0]
    });
    return this.complaintsRepository.save(newComplaint);
  }

  async update(id: number, updateComplaintDto: UpdateComplaintDto) {
    const complaint = await this.findOne(id);
    const cleanDto = Object.fromEntries(Object.entries(updateComplaintDto).filter(([_, v]) => v !== undefined));
    Object.assign(complaint, cleanDto);
    return this.complaintsRepository.save(complaint);
  }

  async remove(id: number) {
    const complaint = await this.findOne(id);
    const removed = { ...complaint };
    await this.complaintsRepository.remove(complaint);
    return removed;
  }
}
