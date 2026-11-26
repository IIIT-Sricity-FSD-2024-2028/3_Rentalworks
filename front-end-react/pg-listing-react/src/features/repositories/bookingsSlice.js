import { createRepositorySlice, pick } from './createRepositorySlice';

// Repository: bookings (confirmed / active stays created at checkout)
export const bookingsRepo = createRepositorySlice({
  name: 'bookings',
  base: '/bookings',
  toUpdate: (b) => pick(b, ['status', 'room', 'roomId', 'checkOut']),
});
