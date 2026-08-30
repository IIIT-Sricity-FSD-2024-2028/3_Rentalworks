import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Booking } from './booking.entity';
import { CreateBookingDto, UpdateBookingDto } from './bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
  ) {}

  findAll() {
    return this.bookingsRepository.find({ relations: { tenant: true, property: true } });
  }

  async findOne(id: number) {
    const booking = await this.bookingsRepository.findOne({ where: { id }, relations: { tenant: true, property: true } });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async create(createBookingDto: CreateBookingDto) {
    const newBooking = this.bookingsRepository.create({
      ...createBookingDto,
      status: 'pending'
    });
    return this.bookingsRepository.save(newBooking);
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const booking = await this.findOne(id);
    const cleanDto = Object.fromEntries(Object.entries(updateBookingDto).filter(([_, v]) => v !== undefined));
    Object.assign(booking, cleanDto);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: number) {
    const booking = await this.findOne(id);
    const removed = { ...booking };
    await this.bookingsRepository.remove(booking);
    return removed;
  }

  @Cron('0 * * * * *') // Run every minute
  async handleBookingExpiry() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Using string comparison for SQLite datetime (assuming format is comparable or we can just fetch all pending and filter)
    const pendingBookings = await this.bookingsRepository.find({ where: { status: 'pending' } });
    
    for (const booking of pendingBookings) {
      if (booking.createdAt) {
        const createdAtDate = new Date(booking.createdAt);
        if (createdAtDate < fifteenMinutesAgo) {
          booking.status = 'expired';
          await this.bookingsRepository.save(booking);
          // Optional: Add notification to tenant that booking expired
        }
      }
    }
  }
}
