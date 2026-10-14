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
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.payments)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, (property) => property.payments)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Room, (room) => room.payments, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column()
  room: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column()
  method: string;

  @Column()
  transactionId: string;

  @Column({ type: 'date' })
  paidDate: string;

  @Column()
  status: string;

  @Column()
  clearance: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
