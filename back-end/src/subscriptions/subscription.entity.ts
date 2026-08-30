import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;

  @Column({ nullable: true })
  planId: number;

  @Column()
  planType: string; // 'MONTHLY' | 'YEARLY' | 'LIFETIME'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ type: 'date' })
  startDate: string; // YYYY-MM-DD

  @Column({ type: 'date', nullable: true })
  endDate: string | null; // YYYY-MM-DD, null for lifetime

  @Column({ default: 'PENDING' })
  status: string; // 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING'

  @Column({ nullable: true })
  paymentId: number;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  receiptNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
