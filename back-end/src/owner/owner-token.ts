import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

function secret(): string {
  const value = process.env.OWNER_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error('OWNER_TOKEN_SECRET must contain at least 32 characters');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueOwnerToken(id: number): string {
  const payload = Buffer.from(JSON.stringify({ id, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyOwnerToken(header?: string): number {
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Sign in as owner');
  const [payload, signature, extra] = header.slice(7).split('.');
  if (!payload || !signature || extra) throw new UnauthorizedException('Invalid owner session');
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new UnauthorizedException('Invalid owner session');
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number.isInteger(data.id) && data.id > 0 && Number.isFinite(data.expires) && data.expires > Date.now()) {
      return data.id;
    }
  } catch { /* malformed payload */ }
  throw new UnauthorizedException('Owner session expired');
}
