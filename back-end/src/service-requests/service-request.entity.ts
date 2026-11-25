import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';
import { Service } from '../services/service.entity';

export enum ServiceRequestStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('service_requests')
@Index('IDX_service_requests_tenantId', ['tenantId'])
@Index('IDX_service_requests_propertyId', ['propertyId'])
@Index('IDX_service_requests_roomId', ['roomId'])
@Index('IDX_service_requests_status', ['status'])
@Index('IDX_service_requests_createdAt', ['createdAt'])
export class ServiceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Service, (service) => service.serviceRequests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'serviceId' })
  service?: Service;

  @Column({ nullable: true })
  serviceId?: number;

  @Column({ length: 100, default: 'General' })
  serviceType: string;

  @Column({ length: 100 })
  serviceName: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  requestedDate: string;

  @Column({ length: 50, default: ServiceRequestStatus.PENDING })
  status: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @ManyToOne(() => User, (user) => user.serviceRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, (property) => property.serviceRequests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'propertyId' })
  property?: Property;

  @Column({ nullable: true })
  propertyId?: number;

  @ManyToOne(() => Room, (room) => room.serviceRequests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
