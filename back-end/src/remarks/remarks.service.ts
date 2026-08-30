import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Remark } from './remark.entity';
import { CreateRemarkDto } from './remarks.dto';

@Injectable()
export class RemarksService {
  constructor(
    @InjectRepository(Remark)
    private remarksRepository: Repository<Remark>,
  ) {}

  findByComplaint(complaintId: number) {
    return this.remarksRepository.find({
      where: { complaintId },
      relations: { author: true },
      order: { createdAt: 'ASC' }
    });
  }

  async create(createRemarkDto: CreateRemarkDto) {
    const newRemark = this.remarksRepository.create(createRemarkDto);
    return this.remarksRepository.save(newRemark);
  }
}
