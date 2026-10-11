import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { Booking } from '../bookings/booking.entity';
import { BookingRequest } from '../booking-requests/booking-request.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Payment } from '../payments/payment.entity';
import { Complaint } from '../complaints/complaint.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @ManyToOne(() => User, user => user.properties)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @Column({ type: 'int' })
  rentMin: number;

  @Column({ type: 'int' })
  rentMax: number;

  @Column({ type: 'numeric', precision: 3, scale: 1 })
  safetyScore: number;

  @Column()
  rooms: string;

  @Column({ type: 'int' })
  occupancy: number;

  @Column({ type: 'jsonb' })
  amenities: string[];

  @Column()
  status: string;

  @Column({ default: false })
  docsVerified: boolean;

  @Column({ default: false })
  inspectionPassed: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column()
  compliance: string;

  @Column()
  fireSafety: string;

  @Column({ default: false })
  changeRequestPending: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Room, room => room.property)
  roomEntities: Room[];

  @OneToMany(() => Booking, booking => booking.property)
  bookings: Booking[];

  @OneToMany(() => BookingRequest, req => req.property)
  bookingRequests: BookingRequest[];

  @OneToMany(() => TenantStay, stay => stay.property)
  tenantStays: TenantStay[];

  @OneToMany(() => Payment, payment => payment.property)
  payments: Payment[];

  @OneToMany(() => Complaint, complaint => complaint.property)
  complaints: Complaint[];
}
