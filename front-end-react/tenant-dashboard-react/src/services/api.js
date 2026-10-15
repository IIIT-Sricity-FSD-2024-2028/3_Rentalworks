const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getActiveTenant() {
  try {
    const stored = sessionStorage.getItem('tenant_user') || sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return parsed;
    }
  } catch (_) {}
  return null;
}

/**
 * Custom fetch wrapper to automatically include required headers like x-user-id and x-role.
 */
export const apiFetch = async (endpoint, options = {}) => {
  const activeUser = getActiveTenant();
  const tenantId = activeUser?.id ? String(activeUser.id) : '1';
  const role = activeUser?.role || 'tenant';

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': tenantId,
    'x-role': role,
    ...options.headers,
  };

  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'API Request Failed');
    }

    // Return empty object if no content
    if (response.status === 204) {
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};
