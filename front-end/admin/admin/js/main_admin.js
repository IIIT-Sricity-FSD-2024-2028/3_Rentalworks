// ===================================================
//  main_admin.js
//  Handles: Init, Navigation (fetch-based), Modal,
//           Toast, Utils
// ===================================================

// ===== GLOBAL STATE =====
let users         = [];
let properties    = [];
let bookings      = [];
let payments      = [];
let notifHistory  = [];
let pendingAction = null;
let selectedRecipient = 'all';
let selectedNotifType = 'announcement';
let selectedPriority  = 'routine';

// Track which fragments are already loaded to avoid re-fetching
const loadedFragments = {};

// Map each section name to its fragment file
const FRAGMENT_MAP = {
  dashboard:     'pages/dashboard.html',
  users:         'pages/users.html',
  properties:    'pages/properties.html',
  bookings:      'pages/bookings.html',
  payments:      'pages/payments.html',
  notifications: 'pages/notifications.html'
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  users        = JSON.parse(localStorage.getItem('admin_users'))      || deepClone(ADMIN_DATA.users);
  properties   = JSON.parse(localStorage.getItem('admin_properties')) || deepClone(ADMIN_DATA.properties);
  bookings     = JSON.parse(localStorage.getItem('admin_bookings'))   || deepClone(ADMIN_DATA.bookings);
  payments     = JSON.parse(localStorage.getItem('admin_payments'))   || deepClone(ADMIN_DATA.payments);
  notifHistory = JSON.parse(localStorage.getItem('admin_notifs'))     || deepClone(ADMIN_DATA.notificationHistory);

  checkAuth();
  setupLogout();
  setupNav();
  setupModalEvents();
  setupGearIcon();
  
  // Sync Owner's newly added properties
  syncOwnerProperties();

  // Cross-actor live notifications listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'cross_notifications') {
      const notifs = JSON.parse(e.newValue || '[]');
      if (notifs.length === 0) return;
      const latest = notifs[notifs.length - 1];
      // Only alert if sent by someone else to Admin, or broadcast to all
      if (latest.by !== 'Admin' && (latest.targetRole === 'admin' || latest.targetRole === 'all')) {
        showToast('info', 'Incoming Alert', latest.title + ': ' + latest.message);
      }
    }
  });
});

// ===== NAVIGATION — FETCH-BASED FRAGMENT LOADER =====
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.sec) navigateTo(item.dataset.sec);
    });
  });
}

async function navigateTo(sec) {
  // Update active nav highlight
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.sec === sec)
  );

  const target = document.getElementById('main-content-target');
  if (!target) return;

  // Show loading state
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:60px;color:#94a3b8;font-size:13px;gap:10px">
      <span style="animation:spin 1s linear infinite;display:inline-block">⏳</span> Loading...
    </div>`;

  // Fetch the fragment if not already cached
  if (!loadedFragments[sec]) {
    try {
      const res = await fetch(FRAGMENT_MAP[sec]);
      if (!res.ok) throw new Error(`Failed to load ${FRAGMENT_MAP[sec]}`);
      loadedFragments[sec] = await res.text();
    } catch (err) {
      target.innerHTML = `
        <div style="padding:40px;text-align:center;color:#dc2626">
          <p style="font-size:14px">⚠️ Could not load section: <strong>${sec}</strong></p>
          <p style="font-size:12px;color:#94a3b8;margin-top:8px">${err.message}</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:4px">Make sure you are running this from a local server (e.g. VS Code Live Server)</p>
        </div>`;
      return;
    }
  }

  // Inject the fragment HTML
  target.innerHTML = loadedFragments[sec];

  // Run the render function for this section
  renderSection(sec);
}

function renderSection(sec) {
  switch (sec) {
    case 'dashboard':     renderDashboard();     break;
    case 'users':         renderUsers();         break;
    case 'properties':    renderProperties();    break;
    case 'bookings':      renderBookings();      break;
    case 'payments':      renderPayments();      break;
    case 'notifications': renderNotifications(); break;
  }
}

// ===== AUTH HELPERS — called by auth_admin.js =====
// (showLoginPage removed - redirect is now direct to central login.html)


function showDashboardShell(user) {
  // Restore sidebar and navbar
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.navbar').style.display  = '';
  document.querySelector('.main-wrap').style.marginLeft = '';

  const target = document.getElementById('main-content-target');
  if (target) target.style.padding = '';

  setTxt('nb-name',  'Welcome back, ' + user.name);
  setTxt('nb-email', user.email);
  navigateTo('dashboard');
}

// ===== MODAL =====
function setupModalEvents() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  const mc = document.getElementById('modal-close-btn');
  if (mc) mc.addEventListener('click', closeModal);
}

function openConfirmModal(title, bodyHtml, btnClass, btnText) {
  document.getElementById('modal-title').textContent    = title;
  document.getElementById('modal-subtitle').textContent = '';
  document.getElementById('modal-body').innerHTML =
    `<p style="font-size:13px;line-height:1.6;color:#475569">${bodyHtml}</p>`;
  document.getElementById('modal-foot').innerHTML = `
    <button class="btn-cancel" onclick="closeModal()">Cancel</button>
    <button class="${btnClass}" onclick="triggerPendingAction()">${btnText}</button>
  `;
  document.getElementById('modal-overlay').classList.add('show');
}

function showFormModal(title, subtitle = '', fields = [], onConfirm, btnClass, btnText) {
  document.getElementById('modal-title').textContent = title;
  const subEl = document.getElementById('modal-subtitle');
  if (subEl) subEl.innerHTML = subtitle;

  document.getElementById('modal-body').innerHTML = `
    <div id="modal-custom-content"></div>
    <div class="form-row" id="modal-fields-container">
      ${(fields || []).map((f, idx) => `
        <div class="f-field ${fields.length % 2 !== 0 && idx === fields.length - 1 ? 'full' : ''}">
          <label>${f.label}${f.required ? ' *' : ''}</label>
          ${f.type === 'select'
            ? `<select id="${f.id}">${(f.options || []).map(o =>
                typeof o === 'object'
                  ? `<option value="${o.value}" ${f.value === o.value ? 'selected' : ''}>${o.label}</option>`
                  : `<option value="${o}" ${f.value === o ? 'selected' : ''}>${cap(o)}</option>`
              ).join('')}</select>`
            : `<input type="${f.type}" id="${f.id}" value="${f.value || ''}" placeholder="${f.placeholder || f.label}" />`
          }
          <div class="err-msg" id="err-${f.id}"></div>
        </div>
      `).join('')}
    </div>
  `;
  document.getElementById('modal-foot').innerHTML = `
    <button class="btn-cancel" onclick="closeModal()">Cancel</button>
    <button class="${btnClass}" onclick="triggerPendingAction()">${btnText}</button>
  `;
  pendingAction = onConfirm;
  document.getElementById('modal-overlay').classList.add('show');
}

function showInfoModal(title, subtitle, bodyHtml) {
  document.getElementById('modal-title').textContent    = title;
  document.getElementById('modal-subtitle').textContent = subtitle;
  document.getElementById('modal-body').innerHTML       = bodyHtml;
  document.getElementById('modal-foot').innerHTML =
    `<button class="btn-cancel" onclick="closeModal()">Close</button>`;
  pendingAction = null;
  document.getElementById('modal-overlay').classList.add('show');
}

function triggerPendingAction() { if (pendingAction) pendingAction(); }
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  pendingAction = null;
}

// ===== TOAST =====
let toastTimer;
function showToast(type, title, msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.className = `toast ${type}`;
  t.querySelector('.t-ico').textContent         = icons[type] || 'ℹ️';
  t.querySelector('.t-text strong').textContent = title;
  t.querySelector('.t-text span').textContent   = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== UTILS =====
function g(id)          { return document.getElementById(id); }
function setTxt(id, v)  { const e = document.getElementById(id); if (e) e.textContent = v; }
function cap(s)         { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function validEmail(e)  { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validPhone(p)  { return /^\+?[\d\s\-]{10,}$/.test(p); }
function deepClone(o)   { return JSON.parse(JSON.stringify(o)); }
function fmtCurrency(n) { return '₹' + n.toLocaleString('en-IN'); }

function showFieldErr(id, msg) {
  const el = document.getElementById('err-' + id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function saveData() {
  localStorage.setItem('admin_users',      JSON.stringify(users));
  localStorage.setItem('admin_properties', JSON.stringify(properties));
  localStorage.setItem('admin_bookings',   JSON.stringify(bookings));
  localStorage.setItem('admin_payments',   JSON.stringify(payments));
  localStorage.setItem('admin_notifs',     JSON.stringify(notifHistory));
}

// ===== FALLBACK LOGIN REMOVED =====

// ===== OWNER DATA SYNC =====
function syncOwnerProperties() {
  try {
    let pendingSources = [];

    // Source 1: pg_manager_data_storage (Owner Dashboard additions)
    const ownerData = JSON.parse(localStorage.getItem('pg_manager_data_storage'));
    if (ownerData && ownerData.properties) {
      pendingSources = pendingSources.concat(ownerData.properties);
    }

    // Source 2: registered_owners (Login Page Signups)
    const regOwners = JSON.parse(localStorage.getItem('registered_owners'));
    if (regOwners && Array.isArray(regOwners)) {
      pendingSources = pendingSources.concat(regOwners);
    }

    if (pendingSources.length === 0) return;
    
    let hasNew = false;
    pendingSources.forEach(ownerProp => {
      // Check if Admin already has this property based on ID or Name
      const exists = properties.find(p => p.id === ownerProp.id || p.name === (ownerProp.name || ownerProp.propertyName));
      if (!exists) {
        hasNew = true;
        properties.push({
          id: ownerProp.id || Date.now(),
          name: ownerProp.name || ownerProp.propertyName || 'Unknown',
          location: ownerProp.city || ownerProp.address || 'Unknown Location',
          owner: ownerProp.owner || (ownerProp.name ? ownerProp.name : 'Registered Owner'),
          rentMin: ownerProp.monthlyRent || 5000,
          rentMax: ownerProp.monthlyRent || 8000,
          safetyScore: 8.0,
          rooms: (ownerProp.occupiedRooms || 0) + '/' + (ownerProp.totalRooms || 0),
          occupancy: ownerProp.totalRooms ? Math.round(((ownerProp.occupiedRooms||0) / ownerProp.totalRooms) * 100) : 0,
          amenities: ownerProp.amenities || [],
          status: 'pending', // Key piece: needs verification
          docsVerified: false,
          inspectionPassed: false,
          commissionRate: 10,
          compliance: 'Pending',
          fireSafety: 'Pending',
          changeRequestPending: false
        });
      }
    });

    if (hasNew) {
      saveData();
      if (currentSection === 'properties') renderProperties();
    }
  } catch(e) { console.error('Error syncing owner properties:', e); }
}
