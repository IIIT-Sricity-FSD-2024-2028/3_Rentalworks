import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('notification_receipts')
export class NotificationReceipt {
  @PrimaryColumn() userId: number;
  @PrimaryColumn() notificationId: number;
  @Column({ default: false }) read: boolean;
  @Column({ default: false }) dismissed: boolean;
}
