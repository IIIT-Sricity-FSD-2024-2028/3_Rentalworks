import { createRepositorySlice } from './createRepositorySlice';
import { normalizeStatus } from '../../utils/normalize';

// Repository: issues (maintenance issues). The owner controller (/api/issues)
// returns the owner's tenant issues together with complaints for their
// properties and accepts status with a hyphen ('in-progress').
export const issuesRepo = createRepositorySlice({
  name: 'issues',
  base: '/issues',
  roleBase: { owner: '/api/issues' },
  listPath: { tenant: '/issues/my' },
  updateMethod: 'patch',
  roleUpdateMethod: { owner: 'put' },
  toCreate: (i, role) =>
    role === 'owner'
      ? { propertyId: Number(i.propertyId), title: i.title, description: i.description, category: i.category, priority: String(i.priority || 'medium').toLowerCase() }
      : i,
  toUpdate: (c, role) => (role === 'owner' ? { status: normalizeStatus(c.status).replace(/_/g, '-') } : c),
});
