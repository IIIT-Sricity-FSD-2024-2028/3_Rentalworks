import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Property } from '../properties/property.entity';

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

  @Column({
    type: 'varchar',
    default: 'tenant',
  })
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

  @Column({ type: 'decimal', nullable: true })
  subscriptionFee?: number;

  @ManyToOne(() => Property, { nullable: true })
  @JoinColumn({ name: 'assignedPropertyId' })
  assignedProperty?: Property;

  @Column({ nullable: true })
  assignedPropertyId?: number;
}
