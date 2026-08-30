import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userRole = request.headers['x-role'] || request.user?.role;
    
    // Only enforce subscription checks on owners
    if (userRole !== 'owner') {
      return true;
    }

    const userIdStr = request.headers['x-user-id'] || request.user?.id || request.body?.ownerId;
    const userId = userIdStr ? parseInt(userIdStr) : null;

    if (!userId || isNaN(userId)) {
      throw new ForbiddenException('Owner ID required for subscription verification');
    }

    const isActive = await this.subscriptionsService.checkSubscriptionActive(userId);
    if (!isActive) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Active subscription required. Please subscribe or renew your plan to perform this action.',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    return true;
  }
}
