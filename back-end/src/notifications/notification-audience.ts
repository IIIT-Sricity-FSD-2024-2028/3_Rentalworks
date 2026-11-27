import { Notification } from './notification.entity';

// Explicit recipient IDs are the audience snapshot taken when an announcement is sent.
export function isNotificationRecipient(n: Partial<Notification>, userId: number, role?: string): boolean {
  if (!Number.isInteger(userId) || userId <= 0) return false;
  if (n.deliveryStatus && n.deliveryStatus !== 'sent') return false;
  if (n.userId != null && n.userId !== userId) return false;
  if (n.targetRole && n.targetRole !== 'all' && n.targetRole !== role) return false;
  if (n.recipientUserIds != null) return n.recipientUserIds.includes(userId);
  // Property announcements must have a resolved audience; never broaden to all users.
  if (n.targetPropertyId != null) return false;
  return true;
}
