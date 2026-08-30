import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Complaint } from '../complaints/complaint.entity';
import { User } from '../users/user.entity';

@Entity('remarks')
export class Remark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  @ManyToOne(() => Complaint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaintId' })
  complaint: Complaint;

  @Column()
  complaintId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: string;

  @Column({ nullable: true })
  authorRole: string; // Storing the role at time of remark if needed, or derived
}
