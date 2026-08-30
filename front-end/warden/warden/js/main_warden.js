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
document.addEventListener('DOMContentLoaded', () => {
  tenants = JSON.parse(localStorage.getItem('warden_tenants')) || [];
  if (tenants.length < 17) {
    const names = ['Amit Sharma', 'Priya Shah', 'Rahul Kumar', 'Sneha Patil', 'Vikram Singh', 'Anita Desai', 'Karan Patel', 'Neha Sharma', 'Rohan Mehta', 'Pooja Verma', 'Aditya Singh', 'Kavya Rao', 'Siddharth Jain', 'Anjali Gupta', 'Manish Tiwari', 'Priyanka Chopra', 'Rakesh Roshan'];
    tenants = names.map((name, i) => ({
      id: i + 1,
      name: name,
      room: `1${(i + 1).toString().padStart(2, '0')}`,
      phone: `+91 98765 432${(10 + i).toString().slice(-2)}`,
      checkIn: new Date(2023 + (i%2), i%12, (i%28)+1).toLocaleDateString('en-US'),
      rent: i < 5 ? 12500 : (i < 15 ? 9000 : 7500),
      paymentStatus: i % 3 === 0 ? 'pending' : 'paid'
    }));
    localStorage.setItem('warden_tenants', JSON.stringify(tenants));

    violations = [
      { id: 1, tenant: tenants[0].name, room: tenants[0].room, type: 'Late Night Entry', severity: 'Medium', warningCount: 3, date: '3/5/2026' },
      { id: 2, tenant: tenants[2].name, room: tenants[2].room, type: 'Noise Complaint', severity: 'Low', warningCount: 1, date: '3/4/2026' },
      { id: 3, tenant: tenants[6].name, room: tenants[6].room, type: 'Unauthorized Guest', severity: 'High', warningCount: 3, date: '3/6/2026' },
      { id: 4, tenant: tenants[7].name, room: tenants[7].room, type: 'Smoking Indoors', severity: 'High', warningCount: 2, date: '3/3/2026' },
      { id: 5, tenant: tenants[8].name, room: tenants[8].room, type: 'Common Area Misuse', severity: 'Low', warningCount: 1, date: '3/2/2026' }
    ];
    localStorage.setItem('warden_violations', JSON.stringify(violations));
  } else {
    violations = JSON.parse(localStorage.getItem('warden_violations')) || [...MOCK_DATA.violations];
  }

  rooms = JSON.parse(localStorage.getItem('warden_rooms')) || [];
  if (rooms.length < 20) {
    const generatedRooms = [];
    for(let i=1; i<=20; i++) {
      generatedRooms.push({
        id: Date.now() + i,
        number: `1${i.toString().padStart(2, '0')}`,
        type: i <= 5 ? 'Single' : (i <= 15 ? 'Double' : 'Triple'),
        occupancy: i <= 17 ? 'Occupied' : 'Vacant',
        maintenance: i <= 17 ? 'Ready' : (i === 18 ? 'Under Maintenance' : 'Cleaned'),
        lastUpdated: new Date().toLocaleDateString('en-US')
      });
    }
    rooms = generatedRooms;
    localStorage.setItem('warden_rooms', JSON.stringify(rooms));
  }

  notifications = JSON.parse(localStorage.getItem('warden_notifications')) || [...MOCK_DATA.notifications];

  // Merge global complaints, issues, and services from Tenant into Warden's complaints view
  let globalCmp = JSON.parse(localStorage.getItem('global_complaints')) || [];
  let globalIss = JSON.parse(localStorage.getItem('global_issues')) || [];
  let globalSrv = JSON.parse(localStorage.getItem('global_services')) || [];

  const fbName = tenants.length > 0 ? tenants[0].name : 'Amit Sharma';
  const fbRoom = tenants.length > 0 ? tenants[0].room : '101';

  // Build unified complaints array
  complaints = [
    ...globalCmp.map(c => ({
      id: c.id, tenant: c.tenantName || fbName, room: c.room || fbRoom, type: 'Complaint', priority: c.priority || 'medium', status: c.status === 'in-progress' ? 'in_progress' : c.status, date: c.created || new Date().toLocaleDateString(), description: c.desc, _source: 'complaints'
    })),
    ...globalIss.map(i => ({
      id: i.id, tenant: i.tenantName || fbName, room: i.room || fbRoom, type: 'Issue: ' + i.category, priority: i.priority || 'medium', status: i.status === 'in-progress' ? 'in_progress' : i.status, date: new Date().toLocaleDateString(), description: i.desc, _source: 'issues'
    })),
    ...globalSrv.map(s => ({
      id: s.id, tenant: s.tenantName || fbName, room: s.room || fbRoom, type: 'Service: ' + s.name, priority: 'low', status: s.status === 'pending' ? 'open' : s.status, date: s.date, description: 'Requested ' + s.name, _source: 'services'
    }))
  ];

  if (complaints.length === 0) {
    complaints = JSON.parse(localStorage.getItem('warden_complaints')) || [...MOCK_DATA.complaints];
  }

  checkAuth();           // from auth_warden.js
  setupLogout();         // from auth_warden.js
  setupNavigation();
  setupModalClose();

  // Cross-actor live notifications listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'cross_notifications') {
      const notifs = JSON.parse(e.newValue || '[]');
      if (notifs.length === 0) return;
      const latest = notifs[notifs.length - 1];

      // Warden receives notifications if targetRole is 'warden' or 'all'
      if (latest.by !== 'Warden' && (latest.targetRole === 'warden' || latest.targetRole === 'all')) {
        showToast('info', 'Incoming Update', latest.title + ': ' + latest.message);

        // Deduplicate before adding
        const alreadyExists = notifications.some(n => n.id === latest.id);
        if (!alreadyExists) {
          notifications.unshift({
            id: latest.id,
            type: latest.type || 'info',
            title: latest.title,
            desc: latest.message,
            time: latest.sentAt || 'Just now',
            unread: true
          });
          saveToStorage();
        }

        // Map tenant complaints/issues/services into warden complaints
        const isTenantAction = ['New Complaint', 'New Issue Reported', 'New Service Request'].includes(latest.title);
        if (isTenantAction) {
          let complaintType = 'General';
          if (latest.title === 'New Issue Reported') complaintType = 'Issue';
          if (latest.title === 'New Service Request') complaintType = 'Service Request';

          const compAlreadyExists = complaints.some(c => String(c.id) === String(latest.id));
          if (!compAlreadyExists) {
            complaints.unshift({
              id: latest.id || Date.now(),
              tenant: latest.tenantName || 'Tenant',
              room: latest.room || 'A-204',
              type: complaintType,
              description: latest.message,
              priority: latest.priority || 'medium',
              status: 'open',
              date: new Date().toLocaleDateString('en-US'),
              timeline: [{ time: new Date().toLocaleString(), event: `${latest.title} filed`, by: 'Tenant' }],
              _source: latest.title === 'New Complaint' ? 'complaints' : (latest.title === 'New Issue Reported' ? 'issues' : 'services')
            });
            saveToStorage();
          }
        }

        if (typeof updateNotifBadge === 'function') updateNotifBadge();
        if (currentSection === 'complaints' && typeof renderComplaints === 'function') renderComplaints();
        if (currentSection === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
        if (currentSection === 'notifications' && typeof renderNotifications === 'function') renderNotifications();
      }
    }

    if (['global_complaints', 'global_issues', 'global_services'].includes(e.key)) {
      // Rebuild unified complaints array
      let gc = JSON.parse(localStorage.getItem('global_complaints')) || [];
      let gi = JSON.parse(localStorage.getItem('global_issues')) || [];
      let gs = JSON.parse(localStorage.getItem('global_services')) || [];
      
      complaints = [
        ...gc.map(c => ({
          id: c.id, tenant: c.tenantName || 'Amit Sharma', room: c.room || 'A-204', type: 'Complaint', priority: c.priority || 'medium', status: c.status === 'in-progress' ? 'in_progress' : c.status, date: c.created || new Date().toLocaleDateString(), description: c.desc, _source: 'complaints'
        })),
        ...gi.map(i => ({
          id: i.id, tenant: i.tenantName || 'Amit Sharma', room: i.room || 'A-204', type: 'Issue: ' + i.category, priority: i.priority || 'medium', status: i.status === 'in-progress' ? 'in_progress' : i.status, date: new Date().toLocaleDateString(), description: i.desc, _source: 'issues'
        })),
        ...gs.map(s => ({
          id: s.id, tenant: s.tenantName || 'Amit Sharma', room: s.room || 'A-204', type: 'Service: ' + s.name, priority: 'low', status: s.status === 'pending' ? 'open' : s.status, date: s.date, description: 'Requested ' + s.name, _source: 'services'
        }))
      ];
      
      if (currentSection === 'complaints' && typeof renderComplaints === 'function') {
        renderComplaints();
      }
    }
  });
});

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
