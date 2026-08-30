import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // 'MONTHLY' | 'YEARLY' | 'LIFETIME'

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true, type: 'int' })
  durationMonths?: number | null; // null for lifetime

  @Column({ default: 'INR' })
  currency: string;

  @Column({ type: 'simple-json' })
  features: string[];

  @Column({ nullable: true })
  badge?: string; // 'Most Popular', 'Best Value'

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
