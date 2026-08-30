// ===================================================
//  main_warden.js  (UPDATED — Single Shell Architecture)
//  Handles: Init, Navigation (fetch-based), Modal, Toast, Utils
// ===================================================

// ===== MOCK DATA FALLBACK =====
if (typeof MOCK_DATA === 'undefined') {
  var MOCK_DATA = {
    warden: { name: 'Warden', email: 'warden@pgrentals.com', phone: '+91 00000 00000', property: 'Default Property' },
    tenants: [],
    rooms: [],
    violations: [],
    complaints: [],
    notifications: []
  };
}

// ===== GLOBAL STATE =====
let currentSection     = 'dashboard';
let currentComplaintId = null;
let tenants            = [];
let rooms              = [];
let violations         = [];
let complaints         = [];
let notifications      = [];

// ===== PAGE FRAGMENT CACHE =====
// Stores fetched HTML strings so we don't re-fetch the same page twice.
const pageCache = {};

// Map section keys → fragment filenames in pages/
const PAGE_MAP = {
  dashboard:     'view_dashboard',
  tenants:       'view_tenants',
  rooms:         'view_rooms',
  violations:    'view_violations',
  complaints:    'view_complaints',
  notifications: 'view_notifications',
  profile:       'view_profile'
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  tenants       = JSON.parse(localStorage.getItem('warden_tenants'))       || [...MOCK_DATA.tenants];
  rooms         = JSON.parse(localStorage.getItem('warden_rooms'))         || [...MOCK_DATA.rooms];
  violations    = JSON.parse(localStorage.getItem('warden_violations'))    || [...MOCK_DATA.violations];
  notifications = JSON.parse(localStorage.getItem('warden_notifications')) || [...MOCK_DATA.notifications];

  checkAuth();           // from auth_warden.js
  setupLogout();         // from auth_warden.js
  setupNavigation();
  setupModalClose();
  
  await fetchComplaints();

  // Polling for updates since WebSockets aren't implemented in the backend yet
  setInterval(fetchComplaints, 10000);
});

async function fetchComplaints() {
  const sessionStr = sessionStorage.getItem('pg_user');
  if (!sessionStr) return;
  const session = JSON.parse(sessionStr);
  if (!session.id) return; // Need user ID for headers

  try {
    const res = await fetch('http://localhost:3000/complaints', {
      headers: {
        'x-user-id': session.id,
        'x-role': session.role
      }
    });
    if (res.ok) {
      const data = await res.json();
      complaints = data.map(c => ({
        id: c.id,
        tenant: c.tenant ? c.tenant.name : 'Unknown',
        room: 'Unknown', // Room is in booking, not complaint directly
        type: 'Complaint',
        priority: 'medium',
        status: c.status,
        date: c.reportedAt,
        description: c.description,
        _source: 'complaints'
      }));
      if (currentSection === 'complaints' && typeof renderComplaints === 'function') renderComplaints();
      if (currentSection === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    }
  } catch (err) {
    console.error('Failed to fetch complaints:', err);
  }
}

// ===== NAVIGATION =====
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      if (section) navigateTo(section);
    });
  });
}

// -------------------------------------------------------
//  navigateTo  — UPDATED for Single Shell Architecture
//
//  1. Highlights the correct sidebar item.
//  2. Fetches the HTML fragment from pages/ (with cache).
//  3. Injects it into #main-content-target.
//  4. Re-attaches any filter/search listeners that live
//     inside the fragment (they are destroyed on replace).
//  5. Calls the render function to populate data.
// -------------------------------------------------------
function navigateTo(section) {
  currentSection = section;

  // --- 1. Update sidebar active state ---
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  // --- 2. Determine the file to fetch ---
  const fileName = PAGE_MAP[section];
  if (!fileName) {
    console.warn('navigateTo: unknown section →', section);
    return;
  }

  // --- 3. Fetch (or use cache) then inject ---
  loadPage(fileName)
    .then(html => {
      // Inject fragment into the single target div
      document.getElementById('main-content-target').innerHTML = html;

      // --- 4. Re-attach listeners that live inside the fragment ---
      //    (These elements were destroyed when innerHTML was replaced.)
      reattachSectionListeners(section);

      // --- 5. Call render function to populate with live data ---
      renderSection(section);

      // Update notification badge on every navigation
      updateNotifBadge();
    })
    .catch(err => {
      document.getElementById('main-content-target').innerHTML =
        `<div style="padding:40px;color:#dc2626;text-align:center">
           ⚠️ Failed to load section: <strong>${section}</strong><br>
           <small>${err.message}</small><br><br>
           <small>Make sure you are running this via a local server (not file://).</small>
         </div>`;
      console.error('Page load error:', err);
    });
}

// -------------------------------------------------------
//  loadPage  — fetch with in-memory cache
// -------------------------------------------------------
function loadPage(fileName) {
  if (pageCache[fileName]) {
    // Return cached version as a resolved Promise
    return Promise.resolve(pageCache[fileName]);
  }

  return fetch(`pages/${fileName}.html`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — pages/${fileName}.html not found`);
      }
      return response.text();
    })
    .then(html => {
      pageCache[fileName] = html; // store in cache
      return html;
    });
}

// -------------------------------------------------------
//  reattachSectionListeners
//  Called AFTER innerHTML is set so elements exist in DOM.
//  Each section's filter/search inputs are recreated on
//  every load, so their event listeners must be re-added.
// -------------------------------------------------------
function reattachSectionListeners(section) {
  switch (section) {
    case 'tenants':       setupTenantSearch();      break;
    case 'rooms':         setupRoomFilter();        break;
    case 'violations':    setupViolationFilter();   break;
    case 'complaints':    setupComplaintFilters();  break;
  }
}

// -------------------------------------------------------
//  renderSection  — calls the correct render function
//  after the fragment is already in the DOM
// -------------------------------------------------------
function renderSection(section) {
  switch (section) {
    case 'dashboard':     renderDashboard();     break;
    case 'tenants':       renderTenants();       break;
    case 'rooms':         renderRooms();         break;
    case 'violations':    renderViolations();    break;
    case 'complaints':    renderComplaints();    break;
    case 'notifications': renderNotifications(); break;
    case 'profile':       renderProfile();       break;
  }
}

// ===== MODAL =====
let modalCallback = null;

function showModal(title, content, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = content;
  modalCallback = onConfirm || null;
  const confirmBtn = document.getElementById('modal-confirm');
  if (confirmBtn) confirmBtn.style.display = onConfirm ? 'block' : 'none';
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  modalCallback = null;
}

function setupModalClose() {
  const overlay    = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const closeBtn   = document.getElementById('modal-close');
  const cancelBtn  = document.getElementById('modal-cancel');
  const confirmBtn = document.getElementById('modal-confirm');

  if (closeBtn)   closeBtn.addEventListener('click', closeModal);
  if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    if (modalCallback) modalCallback();
    closeModal();
  });
}

// ===== TOAST =====
let toastTimer = null;

function showToast(type, title, message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.querySelector('.toast-icon').textContent        = icons[type] || 'ℹ️';
  toast.querySelector('.toast-text strong').textContent = title;
  toast.querySelector('.toast-text span').textContent   = message;

  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== UTILS =====
function setInner(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function saveToStorage() {
  localStorage.setItem('warden_tenants',       JSON.stringify(tenants));
  localStorage.setItem('warden_rooms',         JSON.stringify(rooms));
  localStorage.setItem('warden_violations',    JSON.stringify(violations));
  localStorage.setItem('warden_notifications', JSON.stringify(notifications));

  // Reverse map the unified complaints array back to their global sources
  let globalCmp = JSON.parse(localStorage.getItem('global_complaints')) || [];
  let globalIss = JSON.parse(localStorage.getItem('global_issues')) || [];
  let globalSrv = JSON.parse(localStorage.getItem('global_services')) || [];

  complaints.forEach(wc => {
    if (wc._source === 'complaints') {
      let match = globalCmp.find(c => c.id === wc.id);
      if (match) match.status = wc.status === 'in_progress' ? 'in-progress' : wc.status;
    } else if (wc._source === 'issues') {
      let match = globalIss.find(i => i.id === wc.id);
      if (match) match.status = wc.status === 'in_progress' ? 'in-progress' : wc.status;
    } else if (wc._source === 'services') {
      let match = globalSrv.find(s => s.id === wc.id);
      if (match) match.status = wc.status === 'open' ? 'pending' : wc.status;
    }
  });

  localStorage.setItem('global_complaints', JSON.stringify(globalCmp));
  localStorage.setItem('global_issues', JSON.stringify(globalIss));
  localStorage.setItem('global_services', JSON.stringify(globalSrv));
  localStorage.setItem('warden_complaints', JSON.stringify(complaints)); // fallback
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
