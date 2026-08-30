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
    if (parsed.role !== 'owner') throw new Error('Not owner');
    
    const pathname = window.location.pathname;
    const isSubscriptionPage = pathname.includes('subscription.html');
    const isProfilePage = pathname.includes('profile.html');
    const isAddPropertyPage = pathname.includes('add-property.html');

    const hasActive = parsed.hasActiveSubscription === true || (parsed.subscriptionStatus === 'ACTIVE' && parsed.subscriptionPlan && parsed.subscriptionPlan !== 'Expired' && parsed.subscriptionPlan !== 'None');

    // Subscription page and Profile page are always accessible to owner
    if (isSubscriptionPage || isProfilePage) {
      return parsed;
    }

    // New owner with no subscription at all -> mandatory subscription redirect
    if (!parsed.subscriptionPlan || parsed.subscriptionStatus === 'NONE' || (!hasActive && parsed.subscriptionStatus !== 'EXPIRED')) {
      window.location.href = 'subscription.html?reason=required';
      return null;
    }

    // Expired owner attempting to access Add Property -> redirect to renewal
    if (!hasActive && isAddPropertyPage) {
      window.location.href = 'subscription.html?reason=expired';
      return null;
    }

    return parsed;
  } catch (e) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '../../login/login/login.html';
    return null;
  }
}

// Background sync of subscription status from backend database
async function syncSubscriptionWithBackend() {
  const session = getSession();
  if (!session || session.role !== 'owner') return;

  try {
    const headers = { 'x-role': 'owner' };
    if (session.id) headers['x-user-id'] = String(session.id);

    const res = await fetch(`http://localhost:3000/subscriptions/current?ownerId=${session.id || ''}`, { headers });
    if (res.ok) {
      const data = await res.json();
      session.hasActiveSubscription = data.isActive;
      session.subscriptionStatus = data.status;
      if (data.plan) {
        session.subscriptionPlan = data.plan.displayName;
        session.subscriptionFee = data.subscription ? data.subscription.amount : data.plan.price;
      }
      if (data.subscription) {
        session.subscriptionEndDate = data.subscription.endDate;
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

      // If expired banner needed on dashboard
      if (!data.isActive && data.status === 'EXPIRED') {
        renderSubscriptionAlertBanner('Your subscription has expired. Please renew to list and manage properties.');
      } else if (!data.isActive && data.status === 'NONE') {
        renderSubscriptionAlertBanner('Active subscription required. Please choose a plan.');
      }
    }
  } catch (e) {
    // Fail gracefully if offline
  }
}

function renderSubscriptionAlertBanner(message) {
  let banner = document.getElementById('sub-alert-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'sub-alert-banner';
    banner.style.cssText = 'background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px 20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; color:#991b1b; font-size:14px; font-weight:500;';
    const mainContent = document.getElementById('pageContent');
    if (mainContent) {
      mainContent.insertBefore(banner, mainContent.firstChild);
    }
  }
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span class="material-icons-outlined" style="color:#dc2626;font-size:22px;">warning</span>
      <span>${message}</span>
    </div>
    <a href="subscription.html" style="background:#dc2626; color:white; padding:6px 14px; border-radius:6px; font-weight:600; text-decoration:none; font-size:13px;">Renew Now →</a>
  `;
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

      const data = getData();
      if (data) {
        if (!data.notifications) data.notifications = [];
        // Deduplicate
        if (!data.notifications.find(n => String(n.id) === String(latest.id))) {
          data.notifications.unshift({
            id: latest.id,
            type: latest.type || 'alert',
            title: latest.title,
            message: latest.message,   // owner renderer uses .message
            sender: latest.by || 'System',
            date: latest.sentAt || new Date().toISOString().split('T')[0],
            read: false
          });
          updateData(data);
        }
      }

      loadSidebarBadges();
      if (typeof loadNotifications === 'function' && window.location.pathname.includes('notifications.html')) {
        loadNotifications();
      }
    }
  }

  if (e.key === 'global_issues') {
    if (typeof loadIssues === 'function') {
      loadIssues();
      loadSidebarBadges();
    }
  }
});

// ===== PERSISTENT DATA LAYER =====
const STORAGE_KEY = 'pg_manager_data_storage';
let _cachedData = null;

async function fetchData() {
  if (_cachedData) return JSON.parse(JSON.stringify(_cachedData));

  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    _cachedData = JSON.parse(localData);
    console.log("Loaded data from LocalStorage (Persistent)");
  } else {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error('Failed to load data.json');
      _cachedData = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cachedData));
      console.log("Initialized data from data.json");
    } catch (e) {
      console.error('fetchData error:', e);
      _cachedData = { properties: [], issues: [], notifications: [], policy: {}, profile: {} };
    }
  }

  // Merge cross_notifications intended for Owner
  const crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  if (!_cachedData.notifications) _cachedData.notifications = [];

  let mergedAny = false;
  crossNotifs.forEach(cn => {
    if (cn.targetRole === 'owner' || cn.targetRole === 'all') {
      if (!_cachedData.notifications.find(n => String(n.id) === String(cn.id))) {
        _cachedData.notifications.unshift({
          id: cn.id,
          type: cn.type || 'alert',
          title: cn.title,
          message: cn.message,
          sender: cn.by || 'System',
          date: cn.sentAt || new Date().toISOString().split('T')[0],
          read: false
        });
        mergedAny = true;
      }
    }
  });

  if (mergedAny) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cachedData));
  }

  return JSON.parse(JSON.stringify(_cachedData));
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
  const icons = { success: 'check_circle', error: 'cancel', warning: 'warning', info: 'info', reminder: 'notifications' };
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon material-icons" style="font-size:20px">${icons[type] || icons.info}</span>
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
    { href: 'index.html', icon: 'dashboard', label: 'Dashboard', page: 'dashboard' },
    { href: 'properties.html', icon: 'apartment', label: 'Properties', page: 'properties' },
    { href: 'issues.html', icon: 'warning', label: 'Issues', page: 'issues' },
    { href: 'notifications.html', icon: 'notifications', label: 'Notifications', page: 'notifications' },
    { href: 'policy.html', icon: 'description', label: 'Policy', page: 'policy' },
    { href: 'profile.html', icon: 'person', label: 'Profile', page: 'profile' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}" id="nav-${item.page}">
      <span class="nav-icon"><span class="material-icons-outlined" style="font-size:20px;">${item.icon}</span></span>
      <span>${item.label}</span>
      ${item.page === 'notifications' ? '<span class="nav-badge" id="notifBadge" style="display:none">0</span>' : ''}
      ${item.page === 'issues' ? '<span class="nav-badge" id="issuesBadge" style="display:none">0</span>' : ''}
    </a>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon"><span class="material-icons-outlined" style="font-size:24px;">apartment</span></div>
        <div>
          <div class="logo-text">RentBro</div>
          <div class="logo-sub">Owner Portal</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navHTML}
      </nav>
    </aside>
  `;
}

function getTopbarHTML(title, subtitle = '') {
  return `
    <header class="topbar">
      <div class="topbar-left" style="display:flex; align-items:center; gap:12px;">
        <button id="sidebarToggle" class="icon-btn sidebar-toggle-btn" title="Toggle Sidebar" style="font-size:20px;">
          <span class="material-icons-outlined">menu</span>
        </button>
        <div>
          <div class="topbar-title">${title}</div>
          ${subtitle ? `<div class="topbar-subtitle">${subtitle}</div>` : ''}
        </div>
      </div>
      <div class="topbar-right" style="display:flex; align-items:center; gap:10px;">
        <div class="topbar-search">
          <span class="search-icon material-icons" style="font-size:20px;color:#94a3b8">search</span>
          <input type="text" placeholder="Search..." id="globalSearch">
        </div>
        <a href="notifications.html" class="icon-btn" title="Notifications" style="position:relative">
          <span class="material-icons-outlined" style="font-size:24px;">notifications</span>
          <span class="notif-dot" id="topbarNotifDot" style="display:none"></span>
        </a>
        <a href="profile.html" class="icon-btn" title="Settings & Profile">
          <span class="material-icons-outlined" style="font-size:24px;">settings</span>
        </a>
        <button class="btn-logout" onclick="logout()" style="display:flex; align-items:center; gap:5px; padding:6px 13px; background:#fff5f5; color:#dc2626; border:1px solid #fecaca; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">
          ↪ Logout
        </button>
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

  // Ensure sidebar backdrop element exists
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  // Re-query after injection
  const sidebarEl = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  
  const toggleSidebarFunc = () => {
    if (sidebarEl) sidebarEl.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebarFunc);
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (sidebarEl) sidebarEl.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }

  // Close sidebar on item click (useful on mobile/half screen)
  if (sidebarEl) {
    sidebarEl.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          sidebarEl.classList.remove('open');
          if (backdrop) backdrop.classList.remove('active');
        }
      });
    });
  }

  // Show logged-in role in sidebar
  const roleEl = document.getElementById('sidebarUserRole');
  if (roleEl && session.role) {
    const roleLabels = { owner: 'Property Owner', admin: 'System Admin', warden: 'Warden', tenant: 'Tenant' };
    roleEl.textContent = roleLabels[session.role] || session.role;
  }

  // Load dynamic badge counts
  loadSidebarBadges();
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
  } catch (e) { }
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
  const colors = { High: '#ef4444', Medium: '#eab308', Low: '#3b82f6' };
  return `<span class="material-icons" style="font-size:16px;color:${colors[priority] || '#3b82f6'}">circle</span>`;
}

function getCategoryIcon(category) {
  const icons = {
    Maintenance: 'build', Internet: 'wifi', Appliance: 'computer',
    Housekeeping: 'cleaning_services', Security: 'lock', Electrical: 'flash_on', Plumbing: 'shower'
  };
  return `<span class="material-icons" style="font-size:16px">${icons[category] || 'push_pin'}</span>`;
}

function getNotifIcon(type) {
  const icons = { reminder: 'notifications', alert: 'warning', success: 'check_circle', warning: 'error', info: 'info' };
  return `<span class="material-icons" style="font-size:16px">${icons[type] || 'info'}</span>`;
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