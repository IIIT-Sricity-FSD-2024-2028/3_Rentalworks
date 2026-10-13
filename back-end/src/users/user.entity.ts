import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { Payment } from '../payments/payment.entity';
import { Complaint } from '../complaints/complaint.entity';
import { BookingRequest } from '../booking-requests/booking-request.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', default: 'tenant' })
  role: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'date' })
  joinDate: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  subscriptionPlan?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  subscriptionFee?: number;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  pincode?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'jsonb', nullable: true })
  policy?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Property, property => property.owner)
  properties: Property[];

  @OneToMany(() => Booking, booking => booking.tenant)
  bookings: Booking[];

  @OneToMany(() => BookingRequest, req => req.tenant)
  bookingRequests: BookingRequest[];

  @OneToMany(() => TenantStay, stay => stay.tenant)
  tenantStays: TenantStay[];

  @OneToMany(() => Payment, payment => payment.tenant)
  payments: Payment[];

  @OneToMany(() => Complaint, complaint => complaint.tenant)
  complaints: Complaint[];
}
