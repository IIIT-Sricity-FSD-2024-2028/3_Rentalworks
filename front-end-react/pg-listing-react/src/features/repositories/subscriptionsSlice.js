import { createRepositorySlice } from './createRepositorySlice';

// Repository: subscriptions (owners choose / change / cancel their own plan; admins view)
export const subscriptionsRepo = createRepositorySlice({
  name: 'subscriptions',
  base: '/subscriptions',
  updateMethod: 'patch',
});
