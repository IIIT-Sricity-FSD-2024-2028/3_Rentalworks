import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column({ nullable: true })
  title: string;

  @Column()
  description: string;

  @Column()
  status: string;

  @Column({ type: 'date' })
  reportedAt: string;

  @Column({ type: 'datetime', nullable: true })
  inProgressAt: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true, default: 'medium' })
  priority: string;

  @Column({ nullable: true })
  room: string;

  @Column({ nullable: true, default: 'General' })
  category: string;

  @Column({ nullable: true, default: 'Not Set' })
  severity: string;
}
