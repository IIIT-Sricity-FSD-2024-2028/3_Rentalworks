import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Issue } from '../issues/issue.entity';
import { Notification } from '../notifications/notification.entity';
import { verifySuperAdminToken } from '../super-admin/super-admin-token';

// Owner endpoints derive identity from the signed login token, never a query or form.
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly db: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const id = verifySuperAdminToken(req.headers.authorization);
    const user = await this.db.getRepository(User).findOneBy({ id, role: 'owner', status: 'active' });
    if (!user) throw new ForbiddenException('An active owner account is required');
    req.headers['x-user-id'] = String(id);
    req.headers['x-role'] = 'owner';
    const path = req.route.path as string;
    if (path.endsWith('/properties') && req.method === 'POST') req.body.ownerId = id;
    let propertyId: number | undefined;
    if (path.includes('properties/:id')) propertyId = Number(req.params.id);
    if (path.includes('issues/:id')) {
      const rawId = String(req.params.id);
      const issue = rawId.startsWith('issue-')
        ? await this.db.getRepository(Issue).findOneBy({ id: Number(rawId.slice(6)) })
        : await this.db.getRepository(Complaint).findOneBy({ id: Number(rawId) });
      if (!issue) throw new ForbiddenException('Issue is not available');
      propertyId = issue.propertyId;
    }
    if (path.endsWith('/issues') && req.method === 'POST') propertyId = Number(req.body.propertyId);
    if (propertyId) {
      const property = await this.db.getRepository(Property).findOneBy({ id: propertyId, ownerId: id });
      if (!property) throw new ForbiddenException('Property does not belong to this owner');
    }
    if (path.includes('notifications/:id')) {
      const notification = await this.db.getRepository(Notification).findOneBy({ id: Number(req.params.id) });
      const belongs = notification && (
        notification.userId === id ||
        notification.byUserId === id ||
        notification.recipientUserIds?.includes(id) ||
        (!notification.userId && (!notification.targetRole || ['owner', 'all'].includes(notification.targetRole)))
      );
      if (!belongs) throw new ForbiddenException('Notification does not belong to this owner');
    }
    return true;
  }
}
