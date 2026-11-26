import { createRepositorySlice } from './createRepositorySlice';

// Repository: tenant_stays (which tenant is in which room/bed)
export const tenantStaysRepo = createRepositorySlice({
  name: 'tenantStays',
  base: '/tenant-stays',
  updateMethod: 'put',
});
