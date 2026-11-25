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
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { BookingRequest } from '../booking-requests/booking-request.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Payment } from '../payments/payment.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Issue } from '../issues/issue.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomNumber: string;

  @ManyToOne(() => Property, (property) => property.roomEntities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column({ default: 'double' })
  roomType: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  currentOccupancy: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  rent: number;

  @Column({ default: 'available' })
  status: string;

  @Column({ default: 'Ready' })
  maintenanceStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Booking, (booking) => booking.roomEntity)
  bookings: Booking[];

  @OneToMany(() => BookingRequest, (req) => req.roomEntity)
  bookingRequests: BookingRequest[];

  @OneToMany(() => TenantStay, (stay) => stay.roomEntity)
  tenantStays: TenantStay[];

  @OneToMany(() => Payment, (payment) => payment.roomEntity)
  payments: Payment[];

  @OneToMany(() => Complaint, (complaint) => complaint.roomEntity)
  complaints: Complaint[];

  @OneToMany(() => Issue, (issue) => issue.roomEntity)
  issues: Issue[];

  @OneToMany(() => ServiceRequest, (req) => req.roomEntity)
  serviceRequests: ServiceRequest[];
}
