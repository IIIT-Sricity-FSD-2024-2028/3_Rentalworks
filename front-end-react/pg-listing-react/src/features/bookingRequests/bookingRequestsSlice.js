import { createResourceSlice } from '../shared/createResourceSlice';
import { http, qs } from '../../services/apiClient';

// A request is stored in its own repository. Checkout uses the bookings API.
const path = '/booking-requests';
export const bookingRequests = createResourceSlice({
  name: 'bookingRequests',
  api: {
    list: (filters) => http.get(`${path}${qs(filters)}`),
    create: (details) => http.post(path, details),
    update: (id, changes) => http.put(`${path}/${id}`, changes),
    remove: (id) => http.delete(`${path}/${id}`),
  },
});
