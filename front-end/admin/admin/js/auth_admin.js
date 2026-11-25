// ===================================================
//  auth_admin.js — updated for Shell Architecture & Common Login
//  Checks pg_user session instead of admin_user
// ===================================================

function checkAuth() {
  const user = JSON.parse(sessionStorage.getItem('pg_user'));
  if (user && user.role === 'admin') {
    // Call the showDashboardShell function defined in main_admin.js
    showDashboardShell(user);
  } else {
    window.location.href = '../../login/login/login.html';
  }
}

// Logout
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', () => {
    sessionStorage.removeItem('pg_user');
    window.location.href = '../../login/login/login.html';
  });
}

