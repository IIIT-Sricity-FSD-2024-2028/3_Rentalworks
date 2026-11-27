import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { DataSource } from 'typeorm';
import { checkSessionOrigin, readBrowserSession } from './browser-session';
import { verifySessionToken } from '../super-admin/super-admin-token';
import { User } from './user.entity';

/**
 * The signed-in caller for routes that are reachable both as /x and as
 * /users/session/x. Identity comes from the signed `Authorization: Bearer`
 * token issued at login (what RolesGuard trusts everywhere else) or, when no
 * token is sent, from the signed browser-session cookie.
 */
export async function requireBrowserActor(request: Request, dataSource: DataSource, roles: string[]) {
  let userId: number;
  if (request.headers.authorization) {
    userId = verifySessionToken(request.headers.authorization);
  } else {
    checkSessionOrigin(request);
    const session = readBrowserSession(request);
    if (!session) throw new UnauthorizedException('Sign in to continue');
    userId = session.userId;
  }
  const user = await dataSource.getRepository(User).findOneBy({ id: userId, status: 'active' });
  if (!user) throw new UnauthorizedException('Your session is no longer valid');
  if (!roles.includes(user.role)) throw new ForbiddenException('Your account cannot perform this action');
  return { id: user.id, role: user.role };
}
