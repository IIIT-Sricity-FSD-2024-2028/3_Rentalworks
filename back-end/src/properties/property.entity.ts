export type SharingRents = { single?: number | null; double?: number | null; triple?: number | null };
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { Booking } from '../bookings/booking.entity';
import { BookingRequest } from '../booking-requests/booking-request.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Payment } from '../payments/payment.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Issue } from '../issues/issue.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Service } from '../services/service.entity';

export type PropertyDetailsDocument = {
  name: string;
  contentType: string;
  size: number;
  data: string;
};

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @ManyToOne(() => User, (user) => user.properties)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @Column({ type: 'int' })
  rentMin: number;

  @Column({ type: 'int' })
  rentMax: number;

  @Column({ type: 'numeric', precision: 3, scale: 1, default: 8.0 })
  safetyScore: number;

  @Column()
  rooms: string;

  @Column({ type: 'int', default: 0 })
  occupancy: number;

  @Column({ type: 'jsonb' })
  amenities: string[];

  @Column({ default: 'approved' })
  status: string;

  @Column({ default: false })
  docsVerified: boolean;

  // Only the authenticated review endpoint explicitly selects the private file.
  @Column({ type: 'jsonb', nullable: true, select: false })
  detailsDocument?: PropertyDetailsDocument | null;

  @Column({ default: false })
  inspectionPassed: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column({ default: 'Verified' })
  compliance: string;

  @Column({ default: 'Yes' })
  fireSafety: string;

  @Column({ default: false })
  changeRequestPending: boolean;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  pincode?: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ type: 'int', nullable: true })
  totalCapacity?: number;

  @Column({ type: 'int', nullable: true })
  totalRooms?: number;

  @Column({ type: 'int', nullable: true })
  occupiedRooms?: number;

  @Column({ type: 'int', nullable: true })
  monthlyRent?: number;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  rules?: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  images?: string[];

  /** Listed monthly rent per bed by room size, e.g. { single: 12000, double: 8500, triple: 6500 }. */
  @Column({ type: 'jsonb', nullable: true })
  sharingRents?: SharingRents | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true, default: 'unisex' })
  gender?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Room, (room) => room.property)
  roomEntities: Room[];

  @OneToMany(() => Booking, (booking) => booking.property)
  bookings: Booking[];

  @OneToMany(() => BookingRequest, (req) => req.property)
  bookingRequests: BookingRequest[];

  @OneToMany(() => TenantStay, (stay) => stay.property)
  tenantStays: TenantStay[];

  @OneToMany(() => Payment, (payment) => payment.property)
  payments: Payment[];

  @OneToMany(() => Complaint, (complaint) => complaint.property)
  complaints: Complaint[];

  @OneToMany(() => Issue, (issue) => issue.property)
  issues: Issue[];

  @OneToMany(() => ServiceRequest, (req) => req.property)
  serviceRequests: ServiceRequest[];

  @OneToMany(() => Service, (service) => service.property)
  services: Service[];
}
