const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Helper to write files
const writeFile = (filePath, content) => {
  const fullPath = path.join(srcDir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
};

// 1. User
writeFile('users/user.entity.ts', `
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

  @Column()
  password?: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'date' })
  joinDate: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  subscriptionPlan?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  subscriptionFee?: number;

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
`);

// 2. Property
writeFile('properties/property.entity.ts', `
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
`);

// 3. Room
writeFile('rooms/room.entity.ts', `
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
`);

// 4. BookingRequest
writeFile('booking-requests/booking-request.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';

@Entity('booking_requests')
export class BookingRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bookingRequests)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.bookingRequests)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Room, room => room.bookingRequests, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'date', nullable: true })
  requestedDate?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

// 5. Booking
writeFile('bookings/booking.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bookings)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.bookings)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Room, room => room.bookings, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column()
  room: string; // Kept for frontend compatibility

  @Column({ type: 'date' })
  checkIn: string;

  @Column({ type: 'date', nullable: true })
  checkOut?: string;

  @Column()
  duration: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  rent: number;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

// 6. TenantStay
writeFile('tenant-stays/tenant-stay.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';

@Entity('tenant_stays')
export class TenantStay {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.tenantStays)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.tenantStays)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Room, room => room.tenantStays, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column({ type: 'date' })
  moveInDate: string;

  @Column({ type: 'date', nullable: true })
  moveOutDate?: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

// 7. Payment
writeFile('payments/payment.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.payments)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.payments)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column()
  room: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column()
  method: string;

  @Column()
  transactionId: string;

  @Column({ type: 'date' })
  paidDate: string;

  @Column()
  status: string;

  @Column()
  clearance: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

// 8. Complaint
writeFile('complaints/complaint.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.complaints)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.complaints)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column({ nullable: true })
  title?: string;

  @Column({ default: 'medium' })
  priority: string;

  @Column()
  description: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'date' })
  reportedAt: string;

  @Column({ type: 'date', nullable: true })
  resolvedAt?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

// 9. Notification
writeFile('notifications/notification.entity.ts', `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column()
  type: string;

  @Column()
  priority: string;

  @Column({ type: 'int' })
  recipients: number;

  @Column()
  sentAt: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'byUserId' })
  byUser: User;

  @Column()
  byUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`);

console.log('Entities generated successfully.');
