import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';

@Entity('subscription_payments')
export class SubscriptionPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ nullable: true })
  subscriptionId: number;

  @Column()
  planType: string;

  @Column()
  transactionId: string;

  @Column()
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ default: 'MockGateway' })
  paymentMethod: string;

  @Column({ default: 'SUCCESS' })
  status: string; // 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'

  @Column({ type: 'date' })
  paymentDate: string; // YYYY-MM-DD

  @Column({ nullable: true })
  receiptNumber?: string; // e.g. RB-2026-000123

  @Column({ nullable: true })
  planDuration: string;

  @CreateDateColumn()
  createdAt: Date;
}
