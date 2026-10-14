import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Property } from '../properties/property.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
  ) {}

  findAll(tenantId?: number, propertyId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (propertyId) where.propertyId = propertyId;

    return this.paymentsRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });
    if (!payment)
      throw new NotFoundException(`Payment with ID ${id} not found`);
    return payment;
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const property = await this.propertiesRepository.findOne({
      where: { id: createPaymentDto.propertyId },
    });

    let platformFee = 0;
    if (property && property.commissionRate) {
      platformFee =
        (Number(createPaymentDto.amount) * Number(property.commissionRate)) / 100;
    }

    const newPayment = this.paymentsRepository.create({
      ...createPaymentDto,
      paidDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      clearance: 'Pending',
      platformFee,
    });
    return this.paymentsRepository.save(newPayment);
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updatePaymentDto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(payment, cleanDto);
    return this.paymentsRepository.save(payment);
  }

  async remove(id: number) {
    const payment = await this.findOne(id);
    const removed = { ...payment };
    await this.paymentsRepository.remove(payment);
    return removed;
  }

  async getRevenue() {
    const payments = await this.findAll();

    // Group revenue by region
    const revenueByRegion: Record<string, number> = {};
    let totalRevenue = 0;

    payments.forEach((payment) => {
      const fee = Number(payment.platformFee) || 0;
      if (payment.status === 'verified' && fee > 0) {
        totalRevenue += fee;

        const region = payment.property?.location || 'Unknown';
        revenueByRegion[region] =
          (revenueByRegion[region] || 0) + fee;
      }
    });

    return {
      totalRevenue,
      revenueByRegion,
    };
  }
}
