import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roommate_profiles')
export class RoommateProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ default: 1 })
  propertyId: number;

  @Column({ nullable: true })
  roomNumber: string;

  @Column({ nullable: true })
  roomType: string;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column()
  profession: string;

  @Column()
  company: string;

  @Column()
  sleepSchedule: string;

  @Column()
  cleanliness: string;

  @Column()
  foodHabit: string;

  @Column()
  drinking: string;

  @Column()
  smoking: string;

  @Column('jsonb', { default: [] })
  interests: string[];

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  optedSmartMatch: boolean;

  @Column({ default: false })
  isTenant: boolean;

  @Column({ nullable: true })
  selectedRoommateId: number;

  @Column({ nullable: true })
  matchPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
