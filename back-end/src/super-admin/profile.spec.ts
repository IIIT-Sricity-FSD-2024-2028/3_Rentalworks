import { ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto, UpdateProfileDto } from './super-admin.dto';
import { SuperAdminService } from './super-admin.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
const details = { name: 'Super Admin', email: 'admin@example.com', phone: '+919876543210' };
const validate = (body: object, metatype = UpdateProfileDto as any) => pipe.transform(body, { type: 'body', metatype });

describe('Super admin profile validation and persistence', () => {
  it('normalizes values before validation', async () => {
    expect(await validate({ name: ' Super Admin ', email: ' ADMIN@example.com ', phone: '+91 98765-43210' })).toEqual(details);
  });
  it.each([{ name: '  ' }, { name: 'a' }, { name: 'x'.repeat(101) }, { email: 'invalid' }, { phone: '' }, { phone: '---------123' }, { phone: '1234' }, { phone: '1'.repeat(16) }, { role: 'owner' }])('rejects invalid profile %j', async change => {
    await expect(validate({ ...details, ...change })).rejects.toMatchObject({ status: 400 });
  });
  it.each([{ currentPassword: '' }, { newPassword: 'short' }, { newPassword: '      ' }, { newPassword: 'é'.repeat(37) }, { confirmPassword: undefined }])('rejects invalid password input %j', async change => {
    await expect(validate({ currentPassword: 'old-pass', newPassword: 'new-pass', confirmPassword: 'new-pass', ...change }, ChangePasswordDto)).rejects.toMatchObject({ status: 400 });
  });

  async function fixture() {
    let stored: any = { id: 1, role: 'super_admin', status: 'active', ...details, password: await bcrypt.hash('old-pass', 4) };
    let duplicate: any = null;
    let lookup = '';
    const query: any = { addSelect: jest.fn().mockReturnThis(), where: jest.fn((sql: string) => { lookup = sql; return query; }), getOne: jest.fn(async () => lookup.includes('LOWER') ? duplicate : { ...stored }) };
    const repo: any = {
      findOneBy: jest.fn(async () => ({ ...stored })), createQueryBuilder: () => query,
      save: jest.fn(async value => { stored = { ...value }; return { ...stored }; }),
    };
    const empty: any = {};
    return { service: new SuperAdminService(empty, repo, empty, empty, empty, empty, empty), repo, row: () => stored, duplicate: (value: any) => { duplicate = value; } };
  }

  it('saves every editable detail and returns a fresh repository read', async () => {
    const f = await fixture();
    const changed = await validate({ name: ' Changed Admin ', email: ' CHANGED@example.com ', phone: '+91 91234 56789' });
    const result = await f.service.updateProfile(1, changed);
    expect(f.row()).toMatchObject({ name: 'Changed Admin', email: 'changed@example.com', phone: '+919123456789' });
    expect(await f.service.profile(1)).toEqual(result);
    expect(result).not.toHaveProperty('password');
    expect(f.repo.findOneBy).toHaveBeenCalledTimes(3);
  });
  it('rejects duplicate email and propagates failed database saves', async () => {
    const f = await fixture();
    f.duplicate({ id: 2 });
    await expect(f.service.updateProfile(1, details)).rejects.toMatchObject({ status: 409 });
    expect(f.repo.save).not.toHaveBeenCalled();
    f.duplicate(null);
    f.repo.save.mockRejectedValueOnce({ code: '23505' });
    await expect(f.service.updateProfile(1, details)).rejects.toMatchObject({ status: 409 });
    f.repo.save.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(f.service.updateProfile(1, details)).rejects.toThrow('Database unavailable');
  });
  it('checks current password, confirmation, reuse and persists a usable bcrypt hash', async () => {
    const f = await fixture();
    const change = { currentPassword: 'old-pass', newPassword: 'new-pass', confirmPassword: 'new-pass' };
    await expect(f.service.changePassword(1, { ...change, confirmPassword: 'different' })).rejects.toMatchObject({ status: 400 });
    await expect(f.service.changePassword(1, { ...change, currentPassword: 'wrong' })).rejects.toMatchObject({ status: 401 });
    await expect(f.service.changePassword(1, { currentPassword: 'old-pass', newPassword: 'old-pass', confirmPassword: 'old-pass' })).rejects.toMatchObject({ status: 400 });
    expect(f.repo.save).not.toHaveBeenCalled();
    await f.service.changePassword(1, change);
    expect(f.row().password).not.toBe('new-pass');
    expect(await bcrypt.compare('new-pass', f.row().password)).toBe(true);
    expect(await bcrypt.compare('old-pass', f.row().password)).toBe(false);
  });
});
