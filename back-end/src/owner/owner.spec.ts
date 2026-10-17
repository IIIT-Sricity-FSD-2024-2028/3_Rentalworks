import { OwnerService } from './owner.service';
import { OwnerGuard } from './owner.guard';
import { issueSuperAdminToken } from '../super-admin/super-admin-token';
import { ApiController } from './api.controller';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePropertyDto } from '../properties/properties.dto';

describe('Owner portal regressions', () => {
  const repository = () => ({ find: jest.fn(), findOne: jest.fn(), save: jest.fn(), count: jest.fn() });

  it('filters complaints through property ownership, not tenant ID', async () => {
    const complaints = repository();
    complaints.find.mockResolvedValue([]);
    const users = { manager: { getRepository: () => ({ find: async () => [] }) } };
    const service = new OwnerService(repository() as any, complaints as any, repository() as any, users as any, repository() as any);
    await service.getIssues(42);
    expect(complaints.find).toHaveBeenCalledWith(expect.objectContaining({ where: { property: { ownerId: 42 } } }));
  });

  it('does not fabricate or create a subscription while reading', async () => {
    const users = repository(); users.findOne.mockResolvedValue({ id: 42 });
    const subscriptions = repository(); subscriptions.findOne.mockResolvedValue(null);
    const service = new OwnerService(repository() as any, repository() as any, repository() as any, users as any, subscriptions as any);
    expect(await service.getSubscription(42)).toMatchObject({ currentPlan: null, status: 'inactive' });
    expect(subscriptions.save).not.toHaveBeenCalled();
  });

  it('preserves empty profile fields instead of inventing an identity', async () => {
    const users = repository(); users.findOne.mockResolvedValue({ id: 42, name: 'Actual Owner' });
    const service = new OwnerService(repository() as any, repository() as any, repository() as any, users as any, repository() as any);
    expect(await service.getProfile(42)).toMatchObject({ company: '', city: '', bio: '', subscriptionPlan: '' });
  });

  it('ignores another owner ID supplied in the property query', () => {
    const properties = { findAll: jest.fn() };
    const controller = new ApiController(properties as any, {} as any, {} as any, {} as any);
    controller.findAllProperties('99', 'owner', '42');
    expect(properties.findAll).toHaveBeenCalledWith(42);
  });

  it('rejects unsigned owner headers', async () => {
    const guard = new OwnerGuard({} as any);
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-user-id': '42', 'x-role': 'owner' } }) }) };
    await expect(guard.canActivate(context as any)).rejects.toThrow();
  });

  it('rejects another owner property even with a valid token', async () => {
    const previous = process.env.SUPER_ADMIN_TOKEN_SECRET;
    process.env.SUPER_ADMIN_TOKEN_SECRET = 'test-only-owner-secret-at-least-32-characters';
    try {
      const findOneBy = jest.fn().mockResolvedValueOnce({ id: 42, role: 'owner', status: 'active' }).mockResolvedValueOnce(null);
      const guard = new OwnerGuard({ getRepository: () => ({ findOneBy }) } as any);
      const req = { headers: { authorization: 'Bearer ' + issueSuperAdminToken(42) }, route: { path: '/api/properties/:id' }, params: { id: '99' }, method: 'PUT', body: {} };
      await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any)).rejects.toThrow('Property does not belong');
    } finally {
      if (previous === undefined) delete process.env.SUPER_ADMIN_TOKEN_SECRET;
      else process.env.SUPER_ADMIN_TOKEN_SECRET = previous;
    }
  });

  it('accepts owner property fields and rejects negative room counts', async () => {
    const dto = plainToInstance(CreatePropertyDto, { name: 'Property', location: 'City', ownerId: 42, rentMin: 0, rentMax: 0, rooms: '0/2', amenities: [], address: 'Address', city: 'City', state: 'State', pincode: '600001', type: 'Mixed', totalRooms: 2, occupiedRooms: 0, totalCapacity: 4, monthlyRent: 0 });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    dto.totalRooms = -1;
    expect((await validate(dto)).some(e => e.property === 'totalRooms')).toBe(true);
  });

  it('keeps announcement read state private and hides future or unrelated messages', async () => {
    const notifications = repository();
    notifications.find.mockResolvedValue([
      { id: 1, recipientUserIds: [42, 43], targetRole: 'owner', sentAt: '2020-01-01', read: true, isRead: true },
      { id: 2, recipientUserIds: [43], targetRole: 'owner', sentAt: '2020-01-01' },
      { id: 3, userId: 42, sentAt: '2999-01-01' },
      { id: 4, userId: 42, sentAt: '2020-01-01' },
    ]);
    const users = { manager: { getRepository: () => ({ findBy: async () => [{ notificationId: 4, dismissed: true }] }) } };
    const service = new OwnerService(repository() as any, repository() as any, notifications as any, users as any, repository() as any);
    expect(await service.getNotifications(42)).toEqual([expect.objectContaining({ id: 1, read: false, isRead: false })]);
  });
});
