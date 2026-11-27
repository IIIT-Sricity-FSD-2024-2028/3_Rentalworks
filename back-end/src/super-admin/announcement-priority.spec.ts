import { ValidationPipe } from '@nestjs/common';
import { CreateAnnouncementDto } from './super-admin.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('../migrations/ensure-shared-columns', () => ({
  ensureSharedColumns: jest.fn().mockResolvedValue(undefined),
}));

describe('Platform announcement priority', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const payload = (priority: unknown) => ({
    title: 'Platform update', message: 'Announcement content',
    type: 'announcement', targetRole: 'all', priority,
  });
  const validate = (body: object) => pipe.transform(body, { type: 'body', metatype: CreateAnnouncementDto });

  it.each(['routine', 'important', 'urgent'])('preserves %s through validation, saving, history and scheduled delivery', async priority => {
    const records: any[] = [];
    const query: any = {
      where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => records.filter(item => item.deliveryStatus === 'scheduled')),
    };
    const notifications: any = {
      create: jest.fn(value => ({ ...value })),
      save: jest.fn(async value => { if (!records.includes(value)) records.push(value); return value; }),
      find: jest.fn(async () => records),
      createQueryBuilder: jest.fn(() => query),
    };
    const users: any = { find: jest.fn().mockResolvedValue([{ id: 1, role: 'tenant', status: 'active' }]) };
    const empty: any = { find: jest.fn().mockResolvedValue([]) };
    const service = new SuperAdminService({} as any, users, empty, empty, empty, empty, notifications);

    const immediate = await service.announce(9, await validate(payload(priority)));
    expect(immediate).toMatchObject({ priority, deliveryStatus: 'sent', recipientUserIds: [1] });
    const scheduled = await service.announce(9, await validate({
      ...payload(priority), scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    }));
    expect(scheduled).toMatchObject({ priority, deliveryStatus: 'scheduled' });
    // The query mock supplies the record as due, without waiting for the timer.
    await service.dueAnnouncements();
    expect(scheduled).toMatchObject({ priority, deliveryStatus: 'sent' });
    const history = (await service.overview()).notifications;
    expect(history).toHaveLength(2);
    expect(history.every(item => item.priority === priority)).toBe(true);
    expect(notifications.save).toHaveBeenCalledTimes(3);
  });

  it.each(['high', '', null, undefined])('rejects unsupported or missing priority %s', async priority => {
    await expect(validate(payload(priority))).rejects.toMatchObject({ status: 400 });
  });
});
