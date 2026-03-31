// ===== COMMON.JS =====
// Shared utilities, sidebar, toast, and data helpers

const DATA_URL = 'data.json';
const SESSION_KEY = 'pg_user';

// ===== AUTH GUARD =====
function requireAuth() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) {
    window.location.href = '../../login/login/login.html';
    return null;
  }
  try {
    const parsed = JSON.parse(session);
    if(parsed.role !== 'owner') throw new Error('Not owner');
    return parsed;
  } catch (e) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '../../login/login/login.html';
    return null;
  }
}

function getSession() {
  try {
    const session = sessionStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (e) {
    return null;
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = '../../login/login/login.html';
}

// Global listener for cross-actor simulated notifications
window.addEventListener('storage', (e) => {
  if (e.key === 'cross_notifications') {
    const notifs = JSON.parse(e.newValue || '[]');
    if (notifs.length === 0) return;
    const latest = notifs[notifs.length - 1];
    if (latest.targetRole === 'owner' || latest.targetRole === 'all') {
      showToast(latest.title + ': ' + latest.message, 'warning', 5000);
      loadSidebarBadges(); // Refresh badges
    }
  }
});

// ===== PERSISTENT DATA LAYER =====
const STORAGE_KEY = 'pg_manager_data_storage';
let _cachedData = null;

async function fetchData() {
  // 1. Return memory cache if already loaded
  if (_cachedData) return JSON.parse(JSON.stringify(_cachedData));

  // 2. Check LocalStorage for existing user changes
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    _cachedData = JSON.parse(localData);
    console.log("Loaded data from LocalStorage (Persistent)");
    return JSON.parse(JSON.stringify(_cachedData));
  }

  // 3. Fallback to data.json for the very first load
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('Failed to load data.json');
    _cachedData = await res.json();
    
    // Save to LocalStorage immediately so future refreshes use this copy
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cachedData));
    
    console.log("Initialized data from data.json");
    return JSON.parse(JSON.stringify(_cachedData));
  } catch (e) {
    console.error('fetchData error:', e);
    return { properties: [], issues: [], notifications: [], policy: {}, profile: {} };
  }
}

function updateData(newData) {
  _cachedData = JSON.parse(JSON.stringify(newData));
  // This line ensures that when you delete/edit, it is saved in the browser
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_cachedData));
}

function getData() {
  return _cachedData ? JSON.parse(JSON.stringify(_cachedData)) : null;
}

// ===== TOAST =====
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', reminder: '🔔' };
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

// ===== MODAL =====
function openModal(html, onConfirm) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'globalModal';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  if (onConfirm) {
    const confirmBtn = overlay.querySelector('#modalConfirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
  }
}

function closeModal() {
  const modal = document.getElementById('globalModal');
  if (modal) modal.remove();
}

// ===== SIDEBAR INJECTION =====
function getSidebarHTML(activePage) {
  const navItems = [
    { href: 'index.html', icon: '🏠', label: 'Dashboard', page: 'dashboard' },
    { href: 'properties.html', icon: '🏢', label: 'Properties', page: 'properties' },
    { href: 'issues.html', icon: '⚠️', label: 'Issues', page: 'issues' },
    { href: 'notifications.html', icon: '🔔', label: 'Notifications', page: 'notifications' },
    { href: 'policy.html', icon: '📋', label: 'Policy', page: 'policy' },
    { href: 'profile.html', icon: '👤', label: 'Profile', page: 'profile' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}" id="nav-${item.page}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.page === 'notifications' ? '<span class="nav-badge" id="notifBadge" style="display:none">0</span>' : ''}
      ${item.page === 'issues' ? '<span class="nav-badge" id="issuesBadge" style="display:none">0</span>' : ''}
    </a>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">🏘</div>
        <div>
          <div class="logo-text">PG Manager</div>
          <div class="logo-sub">Owner Dashboard</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-title">Main Menu</div>
        ${navHTML}
        <div class="nav-section-title" style="margin-top:12px">Management</div>
        <a href="add-property.html" class="nav-item ${activePage === 'add-property' ? 'active' : ''}">
          <span class="nav-icon">➕</span>
          <span>Add Property</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" onclick="window.location.href='profile.html'">
          <div class="user-avatar" id="sidebarAvatar">RI</div>
          <div class="user-info">
            <div class="user-name" id="sidebarUserName">Ramesh Iyer</div>
            <div class="user-role" id="sidebarUserRole">Property Owner</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="logout()" style="width:100%;margin-top:10px;gap:8px;justify-content:center;">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  `;
}

function getTopbarHTML(title, subtitle = '') {
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="icon-btn" id="sidebarToggle" title="Toggle Sidebar">☰</button>
        <div>
          <div class="topbar-title">${title}</div>
          ${subtitle ? `<div class="topbar-subtitle">${subtitle}</div>` : ''}
        </div>
      </div>
      <div class="topbar-right">
        <div class="topbar-search">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search..." id="globalSearch">
        </div>
        <a href="notifications.html" class="icon-btn" title="Notifications" style="position:relative">
          🔔
          <span class="notif-dot" id="topbarNotifDot" style="display:none"></span>
        </a>
        <a href="profile.html" class="icon-btn" title="Profile">👤</a>
      </div>
    </header>
  `;
}

function injectLayout(activePage, title, subtitle = '') {
  // Auth guard — redirect to login if no session
  const session = requireAuth();
  if (!session) return;

  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');

  if (sidebar) sidebar.outerHTML = getSidebarHTML(activePage);
  if (topbar) topbar.outerHTML = getTopbarHTML(title, subtitle);

  // Re-query after injection
  const sidebarEl = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn && sidebarEl) {
    toggleBtn.addEventListener('click', () => sidebarEl.classList.toggle('open'));
  }

  // Show logged-in role in sidebar
  const roleEl = document.getElementById('sidebarUserRole');
  if (roleEl && session.role) {
    const roleLabels = { owner: 'Property Owner', admin: 'System Admin', warden: 'Warden', tenant: 'Tenant' };
    roleEl.textContent = roleLabels[session.role] || session.role;
  }

  // Load dynamic badge counts
  loadSidebarBadges();
  loadSidebarUser();
}

async function loadSidebarBadges() {
  try {
    const data = await fetchData();
    const unreadNotifs = (data.notifications || []).filter(n => !n.read).length;
    const openIssues = (data.issues || []).filter(i => i.status === 'Open').length;

    const notifBadge = document.getElementById('notifBadge');
    const issuesBadge = document.getElementById('issuesBadge');
    const topNotifDot = document.getElementById('topbarNotifDot');

    if (notifBadge && unreadNotifs > 0) {
      notifBadge.textContent = unreadNotifs;
      notifBadge.style.display = 'inline-flex';
    }
    if (issuesBadge && openIssues > 0) {
      issuesBadge.textContent = openIssues;
      issuesBadge.style.display = 'inline-flex';
    }
    if (topNotifDot && unreadNotifs > 0) {
      topNotifDot.style.display = 'block';
    }
  } catch (e) {}
}

async function loadSidebarUser() {
  try {
    const data = await fetchData();
    const profile = data.profile || {};
    const nameEl = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarAvatar');
    if (nameEl && profile.name) nameEl.textContent = profile.name;
    if (avatarEl && profile.name) {
      const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarEl.textContent = initials;
    }
  } catch (e) {}
}

// ===== HELPERS =====
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getOccupancyPercent(occupied, total) {
  if (!total) return 0;
  return Math.round((occupied / total) * 100);
}

function getOccupancyClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 40) return 'medium';
  return 'low';
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getPriorityIcon(priority) {
  if (priority === 'High') return '🔴';
  if (priority === 'Medium') return '🟡';
  return '🔵';
}

function getCategoryIcon(category) {
  const icons = {
    Maintenance: '🔧', Internet: '📶', Appliance: '🖥️',
    Housekeeping: '🧹', Security: '🔒', Electrical: '⚡', Plumbing: '🚿'
  };
  return icons[category] || '📌';
}

function getNotifIcon(type) {
  const icons = { reminder: '🔔', alert: '⚠️', success: '✅', warning: '🟡', info: 'ℹ️' };
  return icons[type] || 'ℹ️';
}

function getNotifIconBg(type) {
  const bgs = {
    reminder: 'var(--primary-light)',
    alert: 'var(--danger-bg)',
    success: 'var(--success-bg)',
    warning: 'var(--warning-bg)',
    info: 'var(--info-bg)'
  };
  return bgs[type] || 'var(--bg-main)';
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function validateForm(fields) {
  let valid = true;
  fields.forEach(({ id, msg }) => {
    const group = document.getElementById(id)?.closest('.form-group');
    const input = document.getElementById(id);
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
      if (group) {
        group.classList.add('has-error');
        const errEl = group.querySelector('.form-error');
        if (errEl) errEl.textContent = msg || 'This field is required';
      }
      valid = false;
    } else {
      if (group) group.classList.remove('has-error');
    }
  });
  return valid;
}

function clearFormErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

// ===== CONFIRM DIALOG =====
function confirmDialog(title, message, onYes) {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">${title}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <p style="font-size:14px;color:var(--text-body)">${message}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="modalConfirmBtn">Confirm</button>
    </div>
  `, onYes);
}