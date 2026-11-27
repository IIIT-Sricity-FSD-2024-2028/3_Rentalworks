import { createRepositorySlice, pick } from './createRepositorySlice';

// Repository: complaints (tenant complaints handled by wardens / admins)
export const complaintsRepo = createRepositorySlice({
  name: 'complaints',
  base: '/complaints',
  listPath: { tenant: '/complaints/my' },
  toUpdate: (c, role) => (role === 'tenant' ? c : pick(c, ['status', 'priority', 'category', 'resolution', 'resolvedAt'])),
});
