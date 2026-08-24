import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'byUserId' })
  byUser: User;

  @Column()
  byUserId: number;
}
