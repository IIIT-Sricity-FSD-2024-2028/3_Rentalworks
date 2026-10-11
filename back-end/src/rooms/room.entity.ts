import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { BookingRequest } from '../booking-requests/booking-request.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomNumber: string;

  @ManyToOne(() => Property, property => property.roomEntities)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  currentOccupancy: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  rent: number;

  @Column({ default: 'available' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Booking, booking => booking.roomEntity)
  bookings: Booking[];

  @OneToMany(() => BookingRequest, req => req.roomEntity)
  bookingRequests: BookingRequest[];

  @OneToMany(() => TenantStay, stay => stay.roomEntity)
  tenantStays: TenantStay[];
}
