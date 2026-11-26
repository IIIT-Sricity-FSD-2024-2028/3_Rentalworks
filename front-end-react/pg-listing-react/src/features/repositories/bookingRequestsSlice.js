import { createRepositorySlice } from './createRepositorySlice';

// Repository: booking_requests (unpaid requests awaiting approval / payment)
export const bookingRequestsRepo = createRepositorySlice({
  name: 'bookingRequests',
  base: '/booking-requests',
  updateMethod: 'put',
});
