// services/api.js - Owner API Service connecting to NestJS Backend

import { getStoredUser } from '../../../utils/auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders() {
  const user = getStoredUser();
  if (!user || user.role !== 'owner' || !user.id) throw new Error('Please sign in as an owner');
  const userId = String(user.id);
  const headers = {
    'Content-Type': 'application/json',
    'x-role': 'owner',
    'x-user-id': userId,
    Authorization: 'Bearer ' + (user.token || ''),
  };
  return headers;
}

// Low-level fetch wrapper
export async function apiRequest(endpoint, method, body) {
  const url = BASE_URL + endpoint;
  const headers = getAuthHeaders();

  const options = {
    method: method || 'GET',
    headers: headers,
  };

  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMsg = 'HTTP ' + response.status + ' Error';
    try {
      const errorJson = await response.json();
      if (errorJson.message) {
        errorMsg = Array.isArray(errorJson.message)
          ? errorJson.message.join(', ')
          : errorJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// 1. DASHBOARD STATS
export function getDashboardStats() { return apiRequest('/api/dashboard/stats', 'GET'); }

// 2. PROPERTIES ENDPOINTS
export function getProperties() { return apiRequest('/api/properties'); }

export function getPropertyById(id) { return apiRequest('/api/properties/' + id, 'GET'); }

export function createProperty(propertyData) { return apiRequest('/api/properties', 'POST', propertyData); }

export function updateProperty(id, propertyData) { return apiRequest('/api/properties/' + id, 'PUT', propertyData); }

export function deleteProperty(id) { return apiRequest('/api/properties/' + id, 'DELETE'); }

// 3. ISSUES / COMPLAINTS ENDPOINTS
export function getIssues() { return apiRequest('/api/issues'); }

export function getIssueById(id) { return apiRequest('/api/issues/' + id, 'GET'); }

export function updateIssueStatus(id, newStatus) { return apiRequest('/api/issues/' + id, 'PUT', { status: newStatus }); }

export function createIssue(issueData) { return apiRequest('/api/issues', 'POST', issueData); }

export function deleteIssue(id) { return apiRequest('/api/issues/' + id, 'DELETE'); }

// 4. NOTIFICATIONS ENDPOINTS
export function getNotifications() { return apiRequest('/api/notifications', 'GET'); }

export function markNotificationRead(id) { return apiRequest('/api/notifications/' + id + '/read', 'PUT'); }

export function markAllNotificationsRead() { return apiRequest('/api/notifications/mark-all-read', 'PUT'); }

export function createNotification(notifData) { return apiRequest('/api/notifications', 'POST', notifData); }

export function deleteNotification(id) { return apiRequest('/api/notifications/' + id, 'DELETE'); }

export function clearAllNotifications() { return apiRequest('/api/notifications', 'DELETE'); }

// 5. POLICY ENDPOINTS
export function getPolicy() { return apiRequest('/api/policies', 'GET'); }

export function updatePolicy(policyData) { return apiRequest('/api/policies', 'PUT', policyData); }

// 6. PROFILE ENDPOINTS
export function getProfile() { return apiRequest('/api/profile', 'GET'); }

export function updateProfile(profileData) { return apiRequest('/api/profile', 'PUT', profileData); }

// 7. SUBSCRIPTION ENDPOINTS
export function getSubscription() { return apiRequest('/api/subscription', 'GET'); }

export function updateSubscription(subscriptionData) { return apiRequest('/api/subscription', 'PUT', subscriptionData); }
