import { createRepositorySlice, pick } from './createRepositorySlice';

// Repository: users (every account: tenant, guest, owner, warden, admin, super_admin)
export const usersRepo = createRepositorySlice({
  name: 'users',
  base: '/users',
  toCreate: (u) => ({
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role || 'tenant',
    username: u.username || u.email,
    ...pick(u, ['password', 'region']),
  }),
  toUpdate: (u) => pick(u, ['name', 'status', 'email', 'phone', 'role', 'region']),
});
