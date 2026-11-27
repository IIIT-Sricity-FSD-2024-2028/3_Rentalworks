import { EntityManager, In } from 'typeorm';
import { Room } from '../rooms/room.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { RentDue } from '../rent-dues/rent-due.entity';

/**
 * Bed occupancy is derived from who is actually staying: a room's
 * currentOccupancy = its active tenant stays. Every path that ends a stay
 * (tenant deleted, booking cancelled / deleted, eviction …) recounts the
 * rooms it touched, so the landing page, listings, owner and warden views
 * always show the real free beds.
 */

const ACTIVE = 'active';

/** Recount the given rooms (all rooms when `roomIds` is omitted). Returns what changed. */
export async function recountRooms(manager: EntityManager, roomIds?: number[], dryRun = false) {
  const roomRepo = manager.getRepository(Room);
  const ids = roomIds ? [...new Set(roomIds.filter((x) => Number.isInteger(x) && x > 0))] : undefined;
  if (ids && !ids.length) return [];
  const rooms = await roomRepo.find({ where: ids ? { id: In(ids) } : {}, order: { id: 'ASC' } });
  const counts = await manager
    .getRepository(TenantStay)
    .createQueryBuilder('s')
    .select('s.roomId', 'roomId')
    .addSelect('COUNT(*)', 'n')
    .where('s.status = :active', { active: ACTIVE })
    .andWhere(ids ? 's.roomId IN (:...ids)' : 's.roomId IS NOT NULL', ids ? { ids } : {})
    .groupBy('s.roomId')
    .getRawMany<{ roomId: number; n: string }>();
  const byRoom = new Map(counts.map((c) => [Number(c.roomId), Number(c.n)]));

  const changes: { roomId: number; propertyId: number; roomNumber: string; before: number; after: number; status: string }[] = [];
  for (const room of rooms) {
    const actual = byRoom.get(room.id) || 0;
    const maintenance = String(room.status).toLowerCase() === 'maintenance';
    const status = maintenance ? room.status : actual >= room.capacity ? 'full' : 'available';
    if ((room.currentOccupancy || 0) !== actual || room.status !== status) {
      changes.push({ roomId: room.id, propertyId: room.propertyId, roomNumber: room.roomNumber, before: room.currentOccupancy || 0, after: actual, status });
      if (!dryRun) {
        room.currentOccupancy = actual;
        room.status = status;
        await roomRepo.save(room);
      }
    }
  }
  return changes;
}

/**
 * End a tenant's active stays (optionally only in one room) and cancel rent
 * that is not yet due. Overdue rent stays on the books. Returns the room ids
 * to recount.
 */
export async function endStays(
  manager: EntityManager,
  opts: { tenantId: number; roomId?: number | null; bookingId?: number | null; reason: string; status?: string },
): Promise<number[]> {
  const stays = await manager.getRepository(TenantStay).find({
    where: { tenantId: opts.tenantId, status: ACTIVE, ...(opts.roomId ? { roomId: opts.roomId } : {}) },
  });
  const today = new Date().toISOString().slice(0, 10);
  for (const stay of stays) {
    stay.status = opts.status || 'ended';
    stay.endedAt = new Date();
    stay.endReason = opts.reason;
    stay.moveOutDate = stay.moveOutDate || today;
    await manager.getRepository(TenantStay).save(stay);
  }
  const dueWhere = opts.bookingId ? { bookingId: opts.bookingId } : { tenantId: opts.tenantId };
  await manager.getRepository(RentDue).update({ ...dueWhere, status: In(['upcoming', 'due_soon']) }, { status: 'waived', waivedReason: opts.reason });
  return stays.map((s) => s.roomId).filter((x): x is number => Boolean(x));
}

/** Room ids where this tenant currently has an active stay (read before deleting them). */
export async function activeStayRooms(manager: EntityManager, tenantId: number): Promise<number[]> {
  const stays = await manager.getRepository(TenantStay).find({ where: { tenantId, status: ACTIVE }, select: { roomId: true } });
  return stays.map((s) => s.roomId).filter((x): x is number => Boolean(x));
}
