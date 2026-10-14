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

export enum IssueCategory {
  PLUMBING = 'Plumbing',
  ELECTRICAL = 'Electrical',
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
  INTERNET = 'Internet',
  SECURITY = 'Security',
  APPLIANCES = 'Appliances',
  OTHER = 'Other',
}

export enum IssuePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

@Entity('issues')
@Index('IDX_issues_tenantId', ['tenantId'])
@Index('IDX_issues_propertyId', ['propertyId'])
@Index('IDX_issues_roomId', ['roomId'])
@Index('IDX_issues_status', ['status'])
@Index('IDX_issues_category', ['category'])
@Index('IDX_issues_createdAt', ['createdAt'])
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ length: 100, default: IssueCategory.OTHER })
  category: string;

  @Column({ length: 50, default: IssuePriority.MEDIUM })
  priority: string;

  @Column({ length: 50, default: IssueStatus.OPEN })
  status: string;

  @Column({ length: 255, nullable: true })
  location?: string;

  @ManyToOne(() => User, (user) => user.issues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, (property) => property.issues, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'propertyId' })
  property?: Property;

  @Column({ nullable: true })
  propertyId?: number;

  @ManyToOne(() => Room, (room) => room.issues, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
