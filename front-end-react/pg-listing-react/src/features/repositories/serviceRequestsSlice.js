import { createRepositorySlice } from './createRepositorySlice';

// Repository: service_requests (tenant requests for laundry, cleaning, ...)
export const serviceRequestsRepo = createRepositorySlice({
  name: 'serviceRequests',
  base: '/service-requests',
  listPath: { tenant: '/service-requests/my' },
  updateMethod: 'patch',
});
