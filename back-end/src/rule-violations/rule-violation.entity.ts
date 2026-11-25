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

@Entity('rule_violations')
export class RuleViolation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @Column({ nullable: true })
  tenantName?: string;

  @Column({ nullable: true })
  roomNumber?: string;

  @Column()
  type: string; // 'Late Night Entry', 'Noise Complaint', 'Smoking Indoors', 'Unauthorized Guest', etc.

  @Column({ default: 'low' }) // 'low', 'medium', 'high'
  severity: string;

  @Column({ default: 1 })
  warningCount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  reportedAt: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 'active' }) // 'active', 'warned', 'resolved', 'escalated'
  status: string;

  @Column({ default: false })
  escalatedToOwner: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
