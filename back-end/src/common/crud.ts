import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { Property } from '../properties/property.entity';

/** The verified caller, set on the request by RolesGuard. */
export type AuthUser = { id: number; role: string };

const SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt'];

/** Copy a request body without fields the client may never set. */
export function writable<T extends object>(body: T, extraBlocked: string[] = []): Partial<T> {
  const blocked = new Set([...SYSTEM_FIELDS, ...extraBlocked]);
  return Object.fromEntries(
    Object.entries(body || {}).filter(([k, v]) => !blocked.has(k) && v !== undefined),
  ) as Partial<T>;
}

export async function findOr404<T extends ObjectLiteral>(repo: Repository<T>, id: number, label: string): Promise<T> {
  const row = await repo.findOneBy({ id } as any);
  if (!row) throw new NotFoundException(`${label} ${id} not found`);
  return row;
}

/** Ids of the properties an owner owns (used to scope owner reads). */
export async function ownerPropertyIds(db: DataSource, ownerId: number): Promise<number[]> {
  const rows = await db.getRepository(Property).find({ where: { ownerId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Throw unless the owner owns the property the row belongs to. */
export async function assertOwnerProperty(db: DataSource, user: AuthUser, propertyId?: number | null) {
  if (user.role !== 'owner') return;
  const ids = await ownerPropertyIds(db, user.id);
  if (!propertyId || !ids.includes(Number(propertyId))) {
    throw new ForbiddenException('This record does not belong to your properties');
  }
}

type Scoped = { tenantId?: number | null; propertyId?: number | null };

/**
 * Who may see a tenant-related row: admins / wardens all; owners only rows of
 * their own properties; tenants and guests only their own rows.
 */
export async function scopeRows<T extends Scoped>(db: DataSource, user: AuthUser, rows: T[]): Promise<T[]> {
  if (user.role === 'owner') {
    const ids = new Set(await ownerPropertyIds(db, user.id));
    return rows.filter((r) => ids.has(Number(r.propertyId)));
  }
  if (user.role === 'tenant' || user.role === 'guest') return rows.filter((r) => Number(r.tenantId) === user.id);
  return rows;
}

export async function assertCanSee(db: DataSource, user: AuthUser, row: Scoped) {
  if ((await scopeRows(db, user, [row])).length === 0) throw new ForbiddenException('You do not have access to this record');
}
