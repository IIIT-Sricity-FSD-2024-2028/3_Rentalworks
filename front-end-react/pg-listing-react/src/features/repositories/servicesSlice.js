import { createRepositorySlice } from './createRepositorySlice';

// Repository: services (catalogue of paid services per property)
export const servicesRepo = createRepositorySlice({
  name: 'services',
  base: '/services',
  updateMethod: 'patch',
});
