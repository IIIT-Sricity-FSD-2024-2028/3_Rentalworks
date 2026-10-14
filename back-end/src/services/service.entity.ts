import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Property } from '../properties/property.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';

@Entity('services')
@Index('IDX_services_propertyId', ['propertyId'])
@Index('IDX_services_isAvailable', ['isAvailable'])
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ length: 50, default: 'included_in_rent' })
  pricingModel: string;

  @Column({ length: 100, nullable: true })
  timing?: string;

  @Column({ length: 100, nullable: true })
  location?: string;

  @Column({ default: true })
  isAvailable: boolean;

  @ManyToOne(() => Property, (property) => property.services, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property?: Property;

  @Column({ nullable: true })
  propertyId?: number;

  @OneToMany(() => ServiceRequest, (req) => req.service)
  serviceRequests: ServiceRequest[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
