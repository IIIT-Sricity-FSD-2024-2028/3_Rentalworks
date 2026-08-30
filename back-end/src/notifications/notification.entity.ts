import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'int', nullable: true })
  recipientId: number;

  @Column({ default: false })
  isRead: boolean;

  @Column()
  sentAt: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'byUserId' })
  byUser: User;

  @Column()
  byUserId: number;
}
