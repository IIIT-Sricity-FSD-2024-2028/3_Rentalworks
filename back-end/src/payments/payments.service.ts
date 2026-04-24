import { Injectable, NotFoundException } from '@nestjs/common';
import { PAYMENTS, getNextId } from '../data';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  findAll() {
    return PAYMENTS;
  }

  findOne(id: number) {
    const payment = PAYMENTS.find(p => p.id === id);
    if (!payment) throw new NotFoundException(`Payment with ID ${id} not found`);
    return payment;
  }

  create(createPaymentDto: CreatePaymentDto) {
    const newPayment = {
      id: getNextId('payment'),
      ...createPaymentDto,
      paidDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      clearance: 'Pending'
    };
    PAYMENTS.push(newPayment);
    return newPayment;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    const idx = PAYMENTS.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Payment with ID ${id} not found`);
    PAYMENTS[idx] = { ...PAYMENTS[idx], ...updatePaymentDto };
    return PAYMENTS[idx];
  }

  remove(id: number) {
    const idx = PAYMENTS.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Payment with ID ${id} not found`);
    return PAYMENTS.splice(idx, 1)[0];
  }
}
