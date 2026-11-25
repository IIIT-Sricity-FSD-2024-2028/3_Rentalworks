import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** e.g. TENANT_EVICTED, RENT_MARKED_PAID_OFFLINE, RENT_WAIVED, OWNER_ESCALATION, TENANT_NOTIFIED */
  @Column()
  action: string;

  @Column({ type: 'int', nullable: true })
  actorId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  actorRole?: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorName?: string | null;

  @Column({ type: 'int', nullable: true })
  tenantId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  tenantName?: string | null;

  @Column({ type: 'int', nullable: true })
  propertyId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  roomNumber?: string | null;

  @Column({ type: 'varchar', nullable: true })
  bedNumber?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details?: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
