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

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column()
  type: string;

  @Column()
  priority: string;

  @Column({ type: 'int', default: 1 })
  recipients: number;

  @Column()
  sentAt: string;

  @Column({ type: 'jsonb', nullable: true })
  recipientUserIds?: number[];

  @Column({ type: 'varchar', nullable: true })
  targetRole?: string;

  @Column({ type: 'int', nullable: true })
  targetPropertyId?: number;

  @Column({ type: 'varchar', default: 'sent' })
  deliveryStatus: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'byUserId' })
  byUser: User;

  @Column({ nullable: true })
  byUserId?: number;

  @ManyToOne(() => User, (user) => user.receivedNotifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  @Column({ default: false })
  read: boolean;

  @Column({ default: false, nullable: true })
  isRead?: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
