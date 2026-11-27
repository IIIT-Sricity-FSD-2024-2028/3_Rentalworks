import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type { CookieOptions, Request } from 'express';

export const SESSION_PATH = '/users/session';
export const SESSION_COOKIE = 'rentbro_browser_session';
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const processKey = randomBytes(32);
const developmentOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:4173', 'http://127.0.0.1:4173',
];

export function isAllowedSessionOrigin(origin: string): boolean {
  const configured = process.env.SESSION_FRONTEND_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = configured?.length
    ? configured
    : process.env.NODE_ENV === 'production' ? [] : developmentOrigins;
  return allowed.includes(origin);
}

export function sessionCorsOptions(request: Request) {
  // Private document downloads use the same path-scoped cookie.
  const path = request.path.replace(/\/$/, '');
  const sessionRequest = path === SESSION_PATH || path.startsWith(`${SESSION_PATH}/`);
  const origin = request.headers.origin;
  return {
    origin: sessionRequest ? (origin && isAllowedSessionOrigin(origin) ? origin : false) : '*',
    credentials: sessionRequest,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  };
}

export function checkSessionOrigin(request: Request): void {
  const origin = request.headers.origin;
  if (origin && !isAllowedSessionOrigin(origin)) {
    throw new ForbiddenException('This origin cannot access the browser session');
  }
}

export function browserCookieOptions(request: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.secure || process.env.NODE_ENV === 'production',
    path: SESSION_PATH,
  };
}

function sign(payload: string): string {
  return createHmac('sha256', process.env.SESSION_COOKIE_SECRET || processKey)
    .update(payload)
    .digest('base64url');
}

export function signBrowserSession(userId: number, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readBrowserSession(request: Request): { userId: number; expiresAt: number } | null {
  const entry = request.headers.cookie?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  const parts = entry?.slice(SESSION_COOKIE.length + 1).split('.');
  if (parts?.length !== 3) return null;

  const [id, expiry, signature] = parts;
  const expected = Buffer.from(sign(`${id}.${expiry}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const userId = Number(id);
  const expiresAt = Number(expiry);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }
  return { userId, expiresAt };
}
