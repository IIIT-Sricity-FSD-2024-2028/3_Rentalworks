import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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

  @Column({ type: 'int' })
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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'byUserId' })
  byUser: User;

  @Column({ nullable: true })
  byUserId?: number;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
