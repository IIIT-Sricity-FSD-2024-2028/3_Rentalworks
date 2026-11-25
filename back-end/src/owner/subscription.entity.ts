import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @Column()
  planName: string;

  @Column({ nullable: true })
  planType: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 8000 })
  monthlyFee: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ default: 'INR', nullable: true })
  currency: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 'monthly' })
  billingCycle: string;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
