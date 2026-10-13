import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('warden_notifications')
export class WardenNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: 'issue' }) // 'issue', 'owner_message', 'violation', 'system'
  type: string;

  @Column({ default: 'medium' }) // 'low', 'medium', 'high', 'urgent'
  priority: string;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  senderName?: string;

  @Column({ nullable: true })
  senderRole?: string; // 'tenant', 'owner', 'system'

  @Column({ nullable: true })
  propertyName?: string;

  @Column({ nullable: true })
  roomNumber?: string;

  @Column({ nullable: true })
  tenantId?: number;

  @Column({ nullable: true })
  propertyId?: number;

  @Column({ nullable: true })
  sourceReferenceId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
