// Owner portal endpoints (NestJS /api/* guarded by the owner's signed token).
// Built on the shared client, which adds Authorization / x-role / x-user-id.
import { http, asArray } from '../../../services/apiClient';

const list = async (p) => asArray(await http.get(p));

// 1. DASHBOARD
export const getDashboardStats = () => http.get('/api/dashboard/stats');

// 2. PROPERTIES
export const getProperties = () => list('/api/properties');
export const getPropertyById = (id) => http.get(`/api/properties/${id}`);
export const createProperty = (data) => http.post('/api/properties', data);
export const updateProperty = (id, data) => http.put(`/api/properties/${id}`, data);
export const deleteProperty = (id) => http.delete(`/api/properties/${id}`);

// 3. ISSUES / COMPLAINTS
export const getIssues = () => list('/api/issues');
export const getIssueById = (id) => http.get(`/api/issues/${id}`);
export const updateIssueStatus = (id, status) => http.put(`/api/issues/${id}`, { status });
export const createIssue = (data) => http.post('/api/issues', data);
export const deleteIssue = (id) => http.delete(`/api/issues/${id}`);

// 4. NOTIFICATIONS
export const getNotifications = () => list('/api/notifications');
export const markNotificationRead = (id) => http.put(`/api/notifications/${id}/read`);
export const markAllNotificationsRead = () => http.put('/api/notifications/mark-all-read');
export const createNotification = (data) => http.post('/api/notifications', data);
export const deleteNotification = (id) => http.delete(`/api/notifications/${id}`);
export const clearAllNotifications = () => http.delete('/api/notifications');

// 5. POLICY
export const getPolicy = () => http.get('/api/policies');
export const updatePolicy = (data) => http.put('/api/policies', data);

// 6. PROFILE
export const getProfile = () => http.get('/api/profile');
export const updateProfile = (data) => http.put('/api/profile', data);
export const changePassword = (currentPassword, newPassword) => http.put('/api/profile/password', { currentPassword, newPassword });

// 7. SUBSCRIPTION
export const getSubscription = () => http.get('/api/subscription');
export const updateSubscription = (data) => http.put('/api/subscription', data);
