// Centralized API Service for Warden Dashboard connected to NestJS and Neon DB
const API_BASE = 'http://localhost:3000';

const getHeaders = () => {
  const sessionUser = JSON.parse(sessionStorage.getItem('warden_user')) || 
                      JSON.parse(sessionStorage.getItem('pg_user')) || {};
  return {
    'Content-Type': 'application/json',
    'x-role': sessionUser.role || 'warden',
    'x-user-id': String(sessionUser.id || 9),
  };
};

async function handleResponse(res) {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
      if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

// --- ROOMS API ---
export async function getRoomsApi() {
  const res = await fetch(`${API_BASE}/rooms`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function createRoomApi(roomData) {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(roomData),
  });
  return handleResponse(res);
}

export async function updateRoomApi(id, roomData) {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(roomData),
  });
  return handleResponse(res);
}

export async function deleteRoomApi(id) {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

// --- TENANTS API ---
export async function getTenantsApi() {
  const res = await fetch(`${API_BASE}/tenants`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function createTenantApi(tenantData) {
  const res = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tenantData),
  });
  return handleResponse(res);
}

export async function updateTenantApi(id, tenantData) {
  const res = await fetch(`${API_BASE}/tenants/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(tenantData),
  });
  return handleResponse(res);
}

export async function deleteTenantApi(id) {
  const res = await fetch(`${API_BASE}/tenants/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

// --- USER PROFILE API ---
export async function getUserProfileApi(id) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function updateUserProfileApi(id, profileData) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });
  return handleResponse(res);
}

// --- COMPLAINTS & NOTIFICATIONS API ---
export async function getComplaintsApi() {
  try {
    const res = await fetch(`${API_BASE}/complaints`, {
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

export async function updateComplaintApi(id, data) {
  const res = await fetch(`${API_BASE}/complaints/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getIssuesApi() {
  try {
    const res = await fetch(`${API_BASE}/issues`, {
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

export async function updateIssueApi(id, data) {
  const res = await fetch(`${API_BASE}/issues/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getNotificationsApi() {
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

// --- WARDEN DEDICATED NOTIFICATIONS API ---
export async function getWardenNotificationsApi() {
  try {
    const res = await fetch(`${API_BASE}/warden-notifications`, {
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

export async function createWardenNotificationApi(data) {
  const res = await fetch(`${API_BASE}/warden-notifications`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function markWardenNotificationReadApi(id) {
  const res = await fetch(`${API_BASE}/warden-notifications/${id}/read`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function markAllWardenNotificationsReadApi() {
  const res = await fetch(`${API_BASE}/warden-notifications/mark-all-read`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function deleteWardenNotificationApi(id) {
  const res = await fetch(`${API_BASE}/warden-notifications/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

// --- RULE VIOLATIONS API (CONNECTED TO NEON DB) ---
export async function getRuleViolationsApi() {
  try {
    const res = await fetch(`${API_BASE}/rule-violations`, {
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

export async function createRuleViolationApi(data) {
  const res = await fetch(`${API_BASE}/rule-violations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRuleViolationApi(id, data) {
  const res = await fetch(`${API_BASE}/rule-violations/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function issueRuleViolationWarningApi(id) {
  const res = await fetch(`${API_BASE}/rule-violations/${id}/warning`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function escalateRuleViolationApi(id) {
  const res = await fetch(`${API_BASE}/rule-violations/${id}/escalate`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function deleteRuleViolationApi(id) {
  const res = await fetch(`${API_BASE}/rule-violations/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
}
