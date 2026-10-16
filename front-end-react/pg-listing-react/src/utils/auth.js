// Centralized Authentication and Session Utilities for RentBro

export const clearAuthSession = () => {
  try {
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('super_admin_token');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('pg_manager_data_storage');

    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    localStorage.removeItem('guest_user');
    localStorage.removeItem('tenant_user');
    localStorage.removeItem('warden_user');
    localStorage.removeItem('owner_user');
  } catch (_) {
    // ignore
  }
};

export const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem('pg_user') ||
      sessionStorage.getItem('guest_user') ||
      sessionStorage.getItem('tenant_user') ||
      sessionStorage.getItem('warden_user') ||
      localStorage.getItem('currentUser') ||
      localStorage.getItem('pg_user');

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.role ? parsed : null;
  } catch (_) {
    return null;
  }
};

export const performLogout = () => {
  clearAuthSession();
  try {
    window.dispatchEvent(new Event('rentbro-logout'));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {
    // ignore
  }
  // Replace location so backward browser history doesn't revert to authenticated view
  window.location.replace('/login');
};
