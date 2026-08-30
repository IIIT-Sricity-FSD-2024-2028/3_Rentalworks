<<<<<<< HEAD
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
=======
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
>>>>>>> bb460233e4a02a259714c6eefceba8397348038a

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

  @Column({ nullable: true })
  propertyId?: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  resetToken?: string;

  @Column({ type: 'datetime', nullable: true })
  resetTokenExpiry?: Date;

  @Column({ type: 'datetime', nullable: true })
  sessionValidSince?: Date;
}
