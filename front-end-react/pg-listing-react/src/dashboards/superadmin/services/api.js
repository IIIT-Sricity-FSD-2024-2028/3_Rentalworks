const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, method = 'GET', body = null, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = sessionStorage.getItem('super_admin_token');
    if (!token) throw new Error('Please sign in again.');
    headers.Authorization = `Bearer ${token}`;
    headers['x-role'] = 'super_admin';
  }
  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${path}`, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(result.message) ? result.message.join(', ') : result.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return result;
}

export const api = {
  login: (username, password) => request('/users/login', 'POST', { username, password }, false),
  overview: () => request('/super-admin/overview'),
  profile: () => request('/super-admin/profile'),
  createAdmin: details => request('/super-admin/regional-admins', 'POST', details),
  updateAdmin: (id, details) => request(`/super-admin/regional-admins/${id}`, 'PUT', details),
  updateProfile: details => request('/super-admin/profile', 'PUT', details),
  changePassword: details => request('/super-admin/password', 'PUT', details),
  sendNotification: details => request('/super-admin/announcements', 'POST', details),
};
