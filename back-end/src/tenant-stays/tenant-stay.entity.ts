import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Room } from '../rooms/room.entity';

@Entity('tenant_stays')
export class TenantStay {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.tenantStays)
  @JoinColumn({ name: 'tenantId' })
  tenant: User;

  @Column()
  tenantId: number;

  @ManyToOne(() => Property, property => property.tenantStays)
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Room, room => room.tenantStays, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  roomEntity?: Room;

  @Column({ nullable: true })
  roomId?: number;

  @Column({ type: 'date' })
  moveInDate: string;

  @Column({ type: 'date', nullable: true })
  moveOutDate?: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
