const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
  let user;
  try {
    user = JSON.parse(sessionStorage.getItem("pg_user") || "null");
  } catch {
    user = null;
  }
  if (user?.role !== "owner" || !user.token) {
    throw new Error("Owner session expired. Please sign in again.");
  }
  return {
    "Content-Type": "application/json",
    "x-role": "owner",
    Authorization: `Bearer ${user.token}`,
  };
}

// Low-level fetch wrapper
export async function apiRequest(endpoint, method, body) {
  const url = BASE_URL + endpoint;
  const headers = getAuthHeaders();

  const options = {
    method: method || "GET",
    headers: headers,
  };

  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    sessionStorage.removeItem("pg_user");
    window.location.replace("/login");
    throw new Error("Owner session expired. Please sign in again.");
  }

  if (!response.ok) {
    let errorMsg = "HTTP " + response.status + " Error";
    try {
      const errorJson = await response.json();
      if (errorJson.message) {
        errorMsg = Array.isArray(errorJson.message)
          ? errorJson.message.join(", ")
          : errorJson.message;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
export async function getDashboardStats() {
  return await apiRequest("/api/dashboard/stats", "GET");
}

// ==========================================
// 2. PROPERTIES ENDPOINTS
// ==========================================
export async function getProperties(ownerId) {
  return apiRequest("/api/properties", "GET");
}

export async function getPropertyById(id) {
  return await apiRequest("/api/properties/" + id, "GET");
}

export async function createProperty(propertyData) {
  return await apiRequest("/api/properties", "POST", propertyData);
}

export async function updateProperty(id, propertyData) {
  return await apiRequest("/api/properties/" + id, "PUT", propertyData);
}

export async function deleteProperty(id) {
  return await apiRequest("/api/properties/" + id, "DELETE");
}

// ==========================================
// 3. ISSUES / COMPLAINTS ENDPOINTS
// ==========================================
export async function getIssues(ownerId) {
  return apiRequest("/api/issues", "GET");
}

export async function getIssueById(id) {
  return await apiRequest("/api/issues/" + id, "GET");
}

export async function updateIssueStatus(id, newStatus) {
  return await apiRequest("/api/issues/" + id, "PUT", { status: newStatus });
}

export async function createIssue(issueData) {
  return await apiRequest("/api/issues", "POST", issueData);
}

export async function deleteIssue(id) {
  return await apiRequest("/api/issues/" + id, "DELETE");
}

// ==========================================
// 4. NOTIFICATIONS ENDPOINTS
// ==========================================
export async function getNotifications() {
  return await apiRequest("/api/notifications", "GET");
}

export async function markNotificationRead(id) {
  return await apiRequest("/api/notifications/" + id + "/read", "PUT");
}

export async function markAllNotificationsRead() {
  return await apiRequest("/api/notifications/mark-all-read", "PUT");
}

export async function createNotification(notifData) {
  return await apiRequest("/api/notifications", "POST", notifData);
}

export async function deleteNotification(id) {
  return await apiRequest("/api/notifications/" + id, "DELETE");
}

// ==========================================
// 5. POLICY ENDPOINTS
// ==========================================
export async function getPolicy() {
  return await apiRequest("/api/policies", "GET");
}

export async function updatePolicy(policyData) {
  return await apiRequest("/api/policies", "PUT", policyData);
}

// ==========================================
// 6. PROFILE ENDPOINTS
// ==========================================
export async function getProfile() {
  return await apiRequest("/api/profile", "GET");
}

export async function updateProfile(profileData) {
  return await apiRequest("/api/profile", "PUT", profileData);
}

export async function changePassword(currentPassword, newPassword) {
  return apiRequest("/api/profile/password", "PUT", {
    currentPassword,
    newPassword,
  });
}

// ==========================================
// 7. SUBSCRIPTION ENDPOINTS
// ==========================================
export async function getSubscription() {
  return await apiRequest("/api/subscription", "GET");
}

export async function updateSubscription(subscriptionData) {
  return await apiRequest("/api/subscription", "PUT", subscriptionData);
}
