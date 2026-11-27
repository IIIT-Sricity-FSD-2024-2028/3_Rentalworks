import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { DataSource } from 'typeorm';
import { checkSessionOrigin, readBrowserSession } from './browser-session';
import { User } from './user.entity';

export async function requireBrowserActor(request: Request, dataSource: DataSource, roles: string[]) {
  checkSessionOrigin(request);
  const session = readBrowserSession(request);
  if (!session) throw new UnauthorizedException('Sign in to continue');
  const user = await dataSource.getRepository(User).findOneBy({ id: session.userId, status: 'active' });
  if (!user || !roles.includes(user.role)) throw new ForbiddenException('Your account cannot perform this action');
  return { id: user.id, role: user.role };
}
