import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DataSource } from 'typeorm';
import { User } from '../../users/user.entity';
import { verifySuperAdminToken } from '../../super-admin/super-admin-token';
import { verifyOwnerToken } from '../../owner/owner-token';
import { ensureSharedColumns } from '../../migrations/ensure-shared-columns';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.headers['x-role'];

    if (!userRole) {
      return false; // Role header missing
    }

    if (userRole === 'super_admin') {
      if (!requiredRoles.includes('super_admin')) return false;
      await ensureSharedColumns(this.dataSource);
      const id = verifySuperAdminToken(request.headers.authorization);
      const user = await this.dataSource.getRepository(User).findOneBy({ id });
      if (!user || user.role !== 'super_admin' || user.status !== 'active') return false;
      request.superAdminId = id;
      return true;
    }

    if (userRole === 'owner') {
      // Owner data is exposed through the scoped /api and /owner controllers.
      if (!request.path.startsWith('/api/') && !request.path.startsWith('/owner/')) return false;
      const id = verifyOwnerToken(request.headers.authorization);
      const user = await this.dataSource.getRepository(User).findOneBy({ id });
      if (!user || user.role !== 'owner' || user.status !== 'active') return false;
      request.headers['x-user-id'] = String(id);
      return requiredRoles.includes('owner');
    }

    return requiredRoles.includes(userRole as string);
  }
}
