import { createRepositorySlice } from './createRepositorySlice';

// Repository: rent_dues (monthly rent cycles). Pay / waive are workflow actions in tenantSlices.
export const rentDuesRepo = createRepositorySlice({
  name: 'rentDues',
  base: '/rent-dues',
  updateMethod: 'patch',
});
