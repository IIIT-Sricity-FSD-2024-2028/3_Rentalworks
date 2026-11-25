import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type RentDueStatus = 'paid' | 'upcoming' | 'due_soon' | 'overdue' | 'waived';

@Entity('rent_dues')
@Index('uq_rent_dues_tenant_period', ['tenantId', 'periodStart'], { unique: true })
export class RentDue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: number;

  @Column({ type: 'int', nullable: true })
  stayId?: number | null;

  @Column({ type: 'int', nullable: true })
  bookingId?: number | null;

  @Column()
  propertyId: number;

  @Column({ type: 'int', nullable: true })
  roomId?: number | null;

  @Column({ type: 'int', default: 1 })
  cycleNo: number;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'varchar', default: 'upcoming' })
  status: RentDueStatus;

  @Column({ type: 'int', nullable: true })
  paymentId?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  paidVia?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  overdueAlertedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  wardenReminderAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  waivedReason?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
