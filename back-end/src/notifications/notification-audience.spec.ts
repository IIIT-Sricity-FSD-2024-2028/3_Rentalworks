import { isNotificationRecipient } from './notification-audience';
import { NotificationsService } from './notifications.service';
import { SuperAdminService } from '../super-admin/super-admin.service';

const roles = ['admin', 'tenant', 'owner', 'warden'];
const users = roles.map((role, i) => ({ id: i + 10, role, status: 'active', region: 'Chennai' }));

describe('Platform announcement delivery', () => {
  it.each(['all', ...roles])('delivers %s only to its intended audience', async targetRole => {
    const records: any[] = [];
    const query: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => records),
    };
    const repo: any = {
      create: jest.fn(n => n), save: jest.fn(async n => { records.push(n); return n; }),
      find: jest.fn(async () => records), createQueryBuilder: jest.fn(() => query),
    };
    const userRepo: any = { find: jest.fn().mockResolvedValue(users) };
    const empty: any = {};
    const sender = new SuperAdminService(empty, userRepo, empty, empty, empty, empty, repo);
    const inbox = new NotificationsService(repo);
    const sent = await sender.announce(99, {
      title: 'Notice', message: 'Message', type: 'announcement', priority: 'important', targetRole,
    });
    expect(sent.recipientUserIds).toEqual(users.filter(u => targetRole === 'all' || u.role === targetRole).map(u => u.id));
    for (const user of users) {
      const received = user.role === 'owner' ? await inbox.findForOwner(user.id) : await inbox.findAll(user.id, user.role);
      expect(received).toHaveLength(targetRole === 'all' || user.role === targetRole ? 1 : 0);
    }
    expect(await inbox.findAll()).toEqual([]);
    expect(await inbox.findAll(1234, 'admin')).toEqual([]);
    sent.deliveryStatus = 'scheduled';
    for (const user of users) {
      expect(await inbox.findAll(user.id, user.role)).toEqual([]);
    }
    expect(await inbox.findForOwner(12)).toEqual([]);
  });

  it.each(['tenant', 'warden'])('resolves %s property and individual targeting', async targetRole => {
    const candidates = [{ id: 1, role: targetRole, region: 'Chennai' }, { id: 2, role: targetRole, region: 'Chennai' }, { id: 3, role: targetRole, region: 'Delhi' }];
    const repo: any = { create: (n: any) => n, save: async (n: any) => n };
    const userRepo: any = { find: async () => candidates };
    const properties: any = { existsBy: async () => true, findOneByOrFail: async () => ({ location: 'Chennai' }) };
    const bookings: any = { find: async () => [{ tenantId: 1 }] };
    const stays: any = { find: async () => [{ tenantId: 2 }] };
    const service = new SuperAdminService({} as any, userRepo, properties, {} as any, bookings, stays, repo);
    const dto = { title: 'Notice', message: 'Message', type: 'announcement', priority: 'routine', targetRole, targetPropertyId: 5 };
    expect((await service.announce(99, dto)).recipientUserIds).toEqual([1, 2]);
    const single = await service.announce(99, { ...dto, targetUserId: 2 });
    expect(single.recipientUserIds).toEqual([2]);
    expect(isNotificationRecipient(single, 1, targetRole)).toBe(false);
    expect(isNotificationRecipient(single, 2, targetRole)).toBe(true);
    await expect(service.announce(99, { ...dto, targetUserId: 3 })).rejects.toThrow('No active users');
  });

  it('never broadens empty audiences or unresolved property targeting', () => {
    expect(isNotificationRecipient({ recipientUserIds: [] }, 10, 'admin')).toBe(false);
    expect(isNotificationRecipient({ targetPropertyId: 5 }, 10, 'admin')).toBe(false);
    expect(isNotificationRecipient({ userId: 11 }, 10, 'admin')).toBe(false);
    expect(isNotificationRecipient({ targetRole: 'tenant' }, 10, 'admin')).toBe(false);
    expect(isNotificationRecipient({ targetRole: 'all' }, 10, 'admin')).toBe(true);
  });
});
