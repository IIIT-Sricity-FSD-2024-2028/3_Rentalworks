import { createRepositorySlice, pick } from './createRepositorySlice';

// Repository: payments (rent, deposit and service payments)
export const paymentsRepo = createRepositorySlice({
  name: 'payments',
  base: '/payments',
  toUpdate: (p) => pick(p, ['status', 'clearance']),
});
