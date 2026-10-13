import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DataSource } from 'typeorm';
import { User } from '../../users/user.entity';
import { verifySuperAdminToken } from '../../super-admin/super-admin-token';

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
      const id = verifySuperAdminToken(request.headers.authorization);
      const user = await this.dataSource.getRepository(User).findOneBy({ id });
      if (!user || user.role !== 'super_admin' || user.status !== 'active') return false;
      request.superAdminId = id;
      return true;
    }

    return requiredRoles.includes(userRole as string);
  }
}
