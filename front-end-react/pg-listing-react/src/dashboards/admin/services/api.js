// ===================================================================
//  Admin dashboard endpoints — backend only (NestJS + Neon).
//  The old version silently fell back to localStorage "fake" records and a
//  hard-coded admin id; errors now surface to the UI instead.
// ===================================================================
import { http, asArray } from '../../../services/apiClient';

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined && obj[k] !== '').map((k) => [k, obj[k]]));

const PLAN_PRICES = { MONTHLY: 499, YEARLY: 4999, LIFETIME: 14999 };

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
    }),
  updateUser: (id, u) => http.put(`/users/${id}`, pick(u, ['name', 'status', 'email', 'phone', 'role', 'region'])),
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
  updateBooking: (id, b) => http.put(`/bookings/${id}`, pick(b, ['status', 'room', 'roomId', 'checkOut'])),

  // --- PAYMENTS
  getPayments: async () => asArray(await http.get('/payments')),
  updatePayment: (id, p) => http.put(`/payments/${id}`, pick(p, ['status', 'clearance'])),

  // --- COMPLAINTS
  getComplaints: async () => asArray(await http.get('/complaints')),
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
  deleteNotification: (id) => http.delete(`/notifications/${id}`),
};

/**
 * Subscriptions are derived from owner accounts (plan + fee are stored on the
 * user row). There is no separate admin subscriptions endpoint.
 */
export function deriveSubscriptions(users = []) {
  return users
    .filter((u) => u.role === 'owner')
    .map((o) => {
      const planType = String(o.subscriptionPlan || '').toUpperCase() || 'NONE';
      const amount = Number(o.subscriptionFee) || PLAN_PRICES[planType] || 0;
      return {
        id: o.id,
        ownerId: o.id,
        owner: { name: o.name, email: o.email },
        planType,
        plan: { displayName: planType === 'NONE' ? 'No plan' : `${planType.charAt(0)}${planType.slice(1).toLowerCase()} Plan` },
        amount,
        startDate: o.joinDate || (o.createdAt ? String(o.createdAt).slice(0, 10) : null),
        endDate: null,
        status: planType === 'NONE' ? 'INACTIVE' : o.status === 'active' ? 'ACTIVE' : String(o.status || '').toUpperCase(),
        evaluatedStatus: planType === 'NONE' ? 'INACTIVE' : o.status === 'active' ? 'ACTIVE' : String(o.status || '').toUpperCase(),
        receiptNumber: planType === 'NONE' ? null : `SUB-${String(o.id).padStart(5, '0')}`,
        paymentId: o.id,
      };
    });
}

export function subscriptionStats(subs = []) {
  const active = subs.filter((s) => s.status === 'ACTIVE');
  const count = (p) => active.filter((s) => s.planType === p).length;
  return {
    subscriptions: { totalActive: active.length, monthly: count('MONTHLY'), yearly: count('YEARLY'), lifetime: count('LIFETIME') },
    payments: { totalRevenue: active.reduce((sum, s) => sum + s.amount, 0) },
  };
}
