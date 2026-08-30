import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @Column({ type: 'int' })
  rentMin: number;

  @Column({ type: 'int' })
  rentMax: number;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  safetyScore: number;

  @Column()
  rooms: string;

  @Column({ type: 'int' })
  occupancy: number;

  @Column({ type: 'simple-json' })
  amenities: string[];

  @Column()
  status: string;

  @Column({ default: false })
  docsVerified: boolean;

  @Column({ default: false })
  inspectionPassed: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @Column()
  compliance: string;

  @Column()
  fireSafety: string;

  @Column({ default: false })
  changeRequestPending: boolean;
}
