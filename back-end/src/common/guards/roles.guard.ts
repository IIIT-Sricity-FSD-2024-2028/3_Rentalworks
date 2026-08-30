import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

<<<<<<< HEAD
=======
    const userId = request.headers['x-user-id'];
    if (userId) {
      request.user = { id: userId, role: userRole };
    }
    
>>>>>>> bb460233e4a02a259714c6eefceba8397348038a
    if (userRole === 'super_admin') {
      return true; // Super admin has access to everything
    }

    return requiredRoles.includes(userRole as string);
  }
}
