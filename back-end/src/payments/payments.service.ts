import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  findAll() {
    return this.paymentsRepository.find({ relations: { tenant: true, property: true } });
  }

  async findOne(id: number) {
    const payment = await this.paymentsRepository.findOne({ where: { id }, relations: { tenant: true, property: true } });
    if (!payment) throw new NotFoundException(`Payment with ID ${id} not found`);
    return payment;
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const newPayment = this.paymentsRepository.create({
      ...createPaymentDto,
      paidDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      clearance: 'Pending'
    });
    return this.paymentsRepository.save(newPayment);
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.findOne(id);
    const cleanDto = Object.fromEntries(Object.entries(updatePaymentDto).filter(([_, v]) => v !== undefined));
    Object.assign(payment, cleanDto);
    return this.paymentsRepository.save(payment);
  }

  async remove(id: number) {
    const payment = await this.findOne(id);
    const removed = { ...payment };
    await this.paymentsRepository.remove(payment);
    return removed;
  }
}
