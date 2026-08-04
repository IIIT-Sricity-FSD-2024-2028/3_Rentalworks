import { Injectable, NotFoundException } from '@nestjs/common';
import { BOOKINGS, getNextId, saveData } from '../data';
import { CreateBookingDto, UpdateBookingDto } from './bookings.dto';

@Injectable()
export class BookingsService {
  findAll() {
    return BOOKINGS;
  }

  findOne(id: number) {
    const booking = BOOKINGS.find(b => b.id === id);
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  create(createBookingDto: CreateBookingDto) {
    const newBooking = {
      id: getNextId('booking'),
      ...createBookingDto,
      status: 'pending'
    };
    BOOKINGS.push(newBooking);
    saveData();
    return newBooking;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    const idx = BOOKINGS.findIndex(b => b.id === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);
    BOOKINGS[idx] = { ...BOOKINGS[idx], ...updateBookingDto };
    saveData();
    return BOOKINGS[idx];
  }

  remove(id: number) {
    const idx = BOOKINGS.findIndex(b => b.id === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);
    const removed = BOOKINGS.splice(idx, 1)[0];
    saveData();
    return removed;
  }
}
