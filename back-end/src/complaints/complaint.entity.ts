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

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  reportedBy?: string;

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
