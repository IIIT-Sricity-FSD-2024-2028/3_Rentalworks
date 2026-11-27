// ===================================================================
//  Admin dashboard endpoints — backend only (NestJS + Neon).
//  The old version silently fell back to localStorage "fake" records and a
//  hard-coded admin id; errors now surface to the UI instead.
// ===================================================================
import { http, asArray } from '../../../services/apiClient';

// POST/PUT /users echo the saved row, including the bcrypt hash; never keep it in the store.
const withoutPassword = (row) => {
  if (!row || typeof row !== 'object') return row;
  const { password: _pw, ...rest } = row;
  return rest;
};

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined && obj[k] !== '').map((k) => [k, obj[k]]));

export const api = {
  // --- USERS
  getUsers: async () => asArray(await http.get('/users')),
  createUser: (u) =>
    http.post('/users', {
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role || 'tenant',
      username: u.username || u.email,
      ...(u.password ? { password: u.password } : {}),
      ...(u.region ? { region: u.region } : {}),
    }).then(withoutPassword),
  updateUser: (id, u) => http.put(`/users/${id}`, pick(u, ['name', 'status', 'email', 'phone', 'role', 'region'])).then(withoutPassword),
  deleteUser: (id) =>
    http.delete(`/users/${id}`).catch((err) => {
      // The database refuses to delete accounts that bookings, payments etc. point to.
      if (err.status === 500) throw new Error('This user has linked records (bookings, payments or messages) and cannot be deleted. Suspend the account instead.');
      throw err;
    }),

  // --- PROPERTIES
  getProperties: async () => asArray(await http.get('/properties')),
  createProperty: (p) =>
    http.post('/properties', {
      name: p.name,
      location: p.location,
      ownerId: Number(p.ownerId),
      rentMin: Number(p.rentMin) || 0,
      rentMax: Number(p.rentMax) || Number(p.rentMin) || 0,
      rooms: p.rooms || '0/0',
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      ...(p.gender ? { gender: p.gender } : {}),
    }),
  updateProperty: (id, p) => {
    const body = pick(p, ['status', 'name', 'location', 'rooms', 'gender', 'description']);
    if (p.docsVerified !== undefined) body.docsVerified = Boolean(p.docsVerified);
    if (p.inspectionPassed !== undefined) body.inspectionPassed = Boolean(p.inspectionPassed);
    if (p.ownerId !== undefined) body.ownerId = Number(p.ownerId);
    if (p.rentMin !== undefined) body.rentMin = Number(p.rentMin);
    if (p.rentMax !== undefined) body.rentMax = Number(p.rentMax);
    if (p.rooms !== undefined) body.rooms = String(p.rooms);
    return http.put(`/properties/${id}`, body);
  },
  deleteProperty: (id) => http.delete(`/properties/${id}`),

  // --- BOOKINGS
  getBookings: async () => asArray(await http.get('/bookings')),
  createBooking: (data) => http.post('/bookings', data),
  updateBooking: (id, b) => http.put(`/bookings/${id}`, pick(b, ['status', 'room', 'roomId', 'checkOut'])),
  deleteBooking: (id) => http.delete(`/bookings/${id}`),

  // --- PAYMENTS
  getPayments: async () => asArray(await http.get('/payments')),
  createPayment: (data) => http.post('/payments', data),
  updatePayment: (id, p) => http.put(`/payments/${id}`, pick(p, ['status', 'clearance'])),
  deletePayment: (id) => http.delete(`/payments/${id}`),

  // --- COMPLAINTS
  getComplaints: async () => asArray(await http.get('/complaints')),
  createComplaint: (data) => http.post('/complaints', data),
  updateComplaint: (id, c) => http.put(`/complaints/${id}`, pick(c, ['status', 'priority', 'category', 'resolution', 'resolvedAt'])),
  deleteComplaint: (id) => http.delete(`/complaints/${id}`),

  // --- NOTIFICATIONS
  getNotifications: async () => asArray(await http.get('/notifications')),
  createNotification: (n, byUserId) =>
    http.post('/notifications', {
      title: n.title,
      message: n.message,
      type: n.type || 'announcement',
      priority: n.priority || 'routine',
      recipients: Number(n.recipients) || 1,
      ...(n.targetRole ? { targetRole: n.targetRole } : {}),
      ...(n.userId ? { userId: Number(n.userId) } : {}),
      ...(byUserId ? { byUserId: Number(byUserId) } : {}),
    }),
  updateNotification: (id, changes) => http.put(`/notifications/${id}`, changes),
  deleteNotification: (id) => http.delete(`/notifications/${id}`),
};
