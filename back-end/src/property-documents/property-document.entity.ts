import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Property } from '../properties/property.entity';

/** Documents an owner must submit before a property can be approved. */
export const REQUIRED_DOCUMENT_TYPES = ['ownership_proof', 'id_proof', 'fire_safety_certificate'] as const;
export const DOCUMENT_TYPES = [...REQUIRED_DOCUMENT_TYPES, 'trade_license', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

/**
 * A verification document for a property (ownership deed, ID proof, fire NOC …).
 * Files are stored outside the public uploads folder and are only served to the
 * property's owner and admins.
 */
@Entity('property_documents')
export class PropertyDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @Column()
  ownerId: number;

  @Column()
  docType: string;

  @Column()
  fileName: string;

  /** Path on disk, relative to the backend folder. Never sent to clients. */
  @Column({ select: false })
  filePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
