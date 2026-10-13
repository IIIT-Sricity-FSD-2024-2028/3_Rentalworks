const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Every request from this portal carries the role used by the existing backend.
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-role': 'super_admin',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (username, password) => request('/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  users: () => request('/users'),
  properties: () => request('/properties'),
  payments: () => request('/payments'),
  notifications: () => request('/notifications'),
  createAdmin: (details) => request('/users', { method: 'POST', body: JSON.stringify(details) }),
  updateUser: (id, details) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(details) }),
  sendNotification: (details) => request('/notifications', { method: 'POST', body: JSON.stringify(details) }),
};
