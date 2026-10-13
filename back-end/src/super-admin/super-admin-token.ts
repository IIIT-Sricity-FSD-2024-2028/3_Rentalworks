import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

type TokenData = { id: number; expires: number };

function secret(): string {
  const value = process.env.SUPER_ADMIN_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SUPER_ADMIN_TOKEN_SECRET must contain at least 32 characters');
  }
  return value;
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSuperAdminToken(id: number): string {
  const data: TokenData = { id, expires: Date.now() + 8 * 60 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifySuperAdminToken(header: string | undefined): number {
  if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('Sign in as super admin');
  const token = header.slice(7);
  const parts = token.split('.');
  if (parts.length !== 2) throw new UnauthorizedException('Invalid session');
  const expected = Buffer.from(signature(parts[0]));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new UnauthorizedException('Invalid session');
  }
  let data: TokenData;
  try { data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
  catch { throw new UnauthorizedException('Invalid session'); }
  if (!Number.isInteger(data.id) || !Number.isFinite(data.expires) || data.expires <= Date.now()) {
    throw new UnauthorizedException('Session expired');
  }
  return data.id;
}
