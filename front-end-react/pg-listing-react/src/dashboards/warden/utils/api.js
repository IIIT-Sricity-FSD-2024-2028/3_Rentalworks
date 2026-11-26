// Warden dashboard endpoints — thin wrappers over the shared API client
// (auth headers, base URL and error handling come from services/apiClient).
import { http, qs } from '../../../services/apiClient';

// --- ROOMS
export const getRoomsApi = () => http.get('/rooms');
export const createRoomApi = (roomData) => http.post('/rooms', roomData);
export const updateRoomApi = (id, roomData) => http.put(`/rooms/${id}`, roomData);
export const deleteRoomApi = (id) => http.delete(`/rooms/${id}`);

// --- TENANTS
export const getTenantsApi = () => http.get('/tenants');
<<<<<<< HEAD
=======
/** Every stay (one row per bed a tenant holds). Active ones are the source of truth for occupancy. */
export const getStaysApi = () => http.get('/tenant-stays');
>>>>>>> redux-migration
export const createTenantApi = (tenantData) => http.post('/tenants', tenantData);
export const updateTenantApi = (id, tenantData) => http.put(`/tenants/${id}`, tenantData);
export const deleteTenantApi = (id) => http.delete(`/tenants/${id}`);

// --- COMPLAINTS / ISSUES
export const getComplaintsApi = () => http.get('/complaints');
export const updateComplaintApi = (id, data) => http.put(`/complaints/${id}`, data);
export const getIssuesApi = () => http.get('/issues');
export const updateIssueApi = (id, data) => http.patch(`/issues/${id}`, data);

// --- NOTIFICATIONS
export const sendTenantNotificationApi = (data) => http.post('/notifications', data);

export const getWardenNotificationsApi = () => http.get('/warden-notifications');
export const markWardenNotificationReadApi = (id) => http.put(`/warden-notifications/${id}/read`);
export const markAllWardenNotificationsReadApi = () => http.put('/warden-notifications/mark-all-read');
export const deleteWardenNotificationApi = (id) => http.delete(`/warden-notifications/${id}`);

// --- RULE VIOLATIONS
export const getRuleViolationsApi = () => http.get('/rule-violations');
export const createRuleViolationApi = (data) => http.post('/rule-violations', data);
export const updateRuleViolationApi = (id, data) => http.put(`/rule-violations/${id}`, data);
export const issueRuleViolationWarningApi = (id) => http.post(`/rule-violations/${id}/warning`);
export const escalateRuleViolationApi = (id) => http.post(`/rule-violations/${id}/escalate`);
export const deleteRuleViolationApi = (id) => http.delete(`/rule-violations/${id}`);

// --- RENT LEDGER & WARDEN ACTIONS
export const getRentLedgerApi = (month, propertyId) => http.get(`/rent-dues/ledger${qs({ month, propertyId })}`);
export const getTenantLedgerApi = (tenantId) => http.get(`/rent-dues/tenant/${tenantId}`);
export const markRentPaidOfflineApi = (dueId, note) => http.post(`/rent-dues/${dueId}/mark-paid`, { note: note || undefined });
export const waiveRentApi = (dueId, reason) => http.post(`/rent-dues/${dueId}/waive`, { reason });
export const notifyTenantApi = (tenantId, payload) => http.post(`/warden-actions/tenants/${tenantId}/notify`, payload);
export const escalateTenantApi = (tenantId, payload) => http.post(`/warden-actions/tenants/${tenantId}/escalate`, payload);
export const evictTenantApi = (tenantId, reason) => http.post(`/warden-actions/tenants/${tenantId}/evict`, { reason });
export const getAuditLogsApi = (params = {}) => http.get(`/warden-actions/audit-logs${qs(params)}`);
