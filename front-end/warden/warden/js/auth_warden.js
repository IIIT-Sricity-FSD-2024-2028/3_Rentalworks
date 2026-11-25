// ===================================================
//  auth_warden.js
//  Handles: Session Check, Navigating to central login
// ===================================================

function checkAuth() {
  const user = JSON.parse(sessionStorage.getItem('pg_user'));
  if (user && user.role === 'warden') {
    showDashboard(user);
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  window.location.href = '../../login/login/login.html';
}

function showDashboard(user) {
  const dashboard = document.getElementById('dashboard-page');
  if (dashboard) {
      dashboard.style.display = 'flex';
      dashboard.classList.add('active');
  }
  updateNavbarUser(user);
  
  if (typeof navigateTo === 'function') {
    navigateTo('dashboard');
  }
}

function updateNavbarUser(user) {
  const el = document.getElementById('navbar-user-name');
  const el2 = document.getElementById('navbar-user-email');
  if (el) el.textContent = 'Welcome back, ' + user.name;
  if (el2) el2.textContent = user.email;
}

// ----- Logout -----
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', handleLogout);
}

function handleLogout() {
  sessionStorage.removeItem('pg_user');
  showLoginPage();
}
