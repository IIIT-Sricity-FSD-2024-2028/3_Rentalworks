import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DataSource } from 'typeorm';
import { User } from '../../users/user.entity';
import { verifySessionToken } from '../../super-admin/super-admin-token';
import { ensureSharedColumns } from '../../migrations/ensure-shared-columns';

/**
 * Identity comes ONLY from the signed `Authorization: Bearer <token>` issued at
 * login. The `x-role` / `x-user-id` headers a browser sends are ignored and
 * overwritten with the verified values, so controllers that still read those
 * headers receive trusted data.
 *
 * Routes without @Roles stay public (catalogue, login, register).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();

    // Never trust client-supplied identity headers.
    delete request.headers['x-role'];
    delete request.headers['x-user-id'];

    if (!requiredRoles) return true;

    const id = verifySessionToken(request.headers.authorization);
    await ensureSharedColumns(this.dataSource);
    const user = await this.dataSource.getRepository(User).findOneBy({ id });
    if (!user || user.status !== 'active') throw new UnauthorizedException('Your session is no longer valid');

    request.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    request.headers['x-user-id'] = String(user.id);
    request.headers['x-role'] = user.role;
    if (user.role === 'super_admin') request.superAdminId = user.id;

    if (user.role === 'super_admin' || requiredRoles.includes(user.role)) return true;
    throw new ForbiddenException('You do not have permission to perform this action');
  }
}

/**
 * For public routes that show more to signed-in users: returns the verified
 * caller, or null for anonymous / invalid tokens (never throws).
 */
export async function optionalUser(dataSource: DataSource, authorization?: string) {
  if (!authorization) return null;
  try {
    const id = verifySessionToken(authorization);
    const user = await dataSource.getRepository(User).findOneBy({ id });
    return user && user.status === 'active' ? { id: user.id, role: user.role } : null;
  } catch {
    return null;
  }
}
