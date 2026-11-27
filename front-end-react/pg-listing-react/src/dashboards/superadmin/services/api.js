// Super admin endpoints (signed bearer token is added by the shared client).
import { http } from '../../../services/apiClient';

export const api = {
  login: (username, password) => http.post('/users/login', { username, password }, { auth: false }),
  overview: () => http.get('/super-admin/overview'),
  profile: () => http.get('/super-admin/profile'),
  createAdmin: (details) => http.post('/super-admin/regional-admins', details),
  updateAdmin: (id, details) => http.put(`/super-admin/regional-admins/${id}`, details),
  updateProfile: (details) => http.put('/super-admin/profile', details),
  changePassword: (details) => http.put('/super-admin/password', details),
  sendNotification: (details) => http.post('/super-admin/announcements', details),
  // Platform-wide control (the super admin passes every role guard).
  accounts: () => http.get('/users'),
  updateAccount: (id, changes) => http.put(`/users/${id}`, changes),
  deleteAccount: (id) => http.delete(`/users/${id}`),
  updatePayment: (id, changes) => http.put(`/payments/${id}`, changes),
  bookings: () => http.get('/bookings'),
};
