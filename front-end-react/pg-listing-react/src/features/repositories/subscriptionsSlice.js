import { createRepositorySlice } from './createRepositorySlice';

// Repository: subscriptions (owner plans; admins activate / change / cancel)
export const subscriptionsRepo = createRepositorySlice({
  name: 'subscriptions',
  base: '/subscriptions',
  updateMethod: 'patch',
});
