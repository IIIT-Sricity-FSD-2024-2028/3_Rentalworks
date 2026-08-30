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
  dashboard:       'pages/dashboard.html',
  regional_admins: 'pages/regional_admins.html',
  subscriptions:   'pages/subscriptions.html',
  global_reports:  'pages/global_reports.html',
  notifications:   'pages/notifications.html',
  profile:         'pages/profile.html'
};

async function fetchData() {
  try {
    const headers = { 'x-role': 'super_admin' };
    
    // Helper function to safely fetch and ensure array response
    const fetchArray = async (url) => {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    users        = await fetchArray('http://localhost:3000/users');
    properties   = await fetchArray('http://localhost:3000/properties');
    bookings     = await fetchArray('http://localhost:3000/bookings');
    payments     = await fetchArray('http://localhost:3000/payments');
    notifHistory = await fetchArray('http://localhost:3000/notifications');
    // Merge with local cross-notifications to prevent them from being overwritten
    const localNotifs = JSON.parse(localStorage.getItem('admin_notifs') || '[]');
    const mergedNotifs = [...localNotifs];
    notifHistory.forEach(bn => {
      if (!mergedNotifs.find(m => m.id === bn.id)) mergedNotifs.push(bn);
    });
    notifHistory = mergedNotifs;

    // Merge global_payments
    const localPayments = JSON.parse(localStorage.getItem('global_payments') || '[]');
    const mergedPayments = [...payments];
    localPayments.forEach(lp => {
      if (!mergedPayments.find(m => m.id === lp.id)) mergedPayments.unshift(lp);
    });
    payments = mergedPayments;
  } catch(e) {
    console.error('API Error:', e);
  }

  syncOwnerProperties();
  syncUsers();
  if (typeof syncSunrisePayments === 'function') syncSunrisePayments();

  // Re-render currently active section to reflect real-time stats
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav && activeNav.dataset.sec) {
    renderSection(activeNav.dataset.sec);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await fetchData();

  checkAuth();
  setupLogout();
  setupNav();
  setupModalEvents();
  setupGearIcon();
  
  // Set up polling for real-time stats
  // setInterval(fetchData, 5000); // Polling removed to fix GET 304 spam

  // Cross-actor live notifications listener
  window.addEventListener('storage', (e) => {
    // If relevant storage changes, refresh data immediately to keep stats real-time
    if (['registered_owners', 'registered_guests', 'pg_manager_data_storage', 'cross_notifications'].includes(e.key)) {
      fetchData();
    }

    if (e.key === 'cross_notifications') {
      const notifs = JSON.parse(e.newValue || '[]');
      if (notifs.length === 0) return;
      const latest = notifs[notifs.length - 1];
      if (latest.by !== 'Admin' && (latest.targetRole === 'admin' || latest.targetRole === 'all')) {
        showToast('info', 'Incoming Alert', latest.title + ': ' + latest.message);
        notifHistory.unshift({
            id: latest.id,
            type: latest.type || 'info',
            title: latest.title,
            message: latest.message,
            date: new Date().toLocaleDateString(),
            time: 'Just now',
            read: false,
            sender: latest.by
        });
        saveData();
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.dataset.sec === 'notifications' && typeof renderNotifications === 'function') {
            renderNotifications();
        }
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
    case 'dashboard':       renderDashboard();        break;
    case 'regional_admins': renderRegionalAdmins();   break;
    case 'subscriptions':   renderSubscriptions();    break;
    case 'global_reports':  renderGlobalReports();    break;
    case 'notifications':   renderNotifications();    break;
    case 'profile':         if (typeof renderProfile === 'function') renderProfile(); break;
  }
}

// ===== REGIONAL ADMINS =====
function renderRegionalAdmins(search = '') {
  const tbody = document.getElementById('regional-admins-table-body');
  if (!tbody) return;

  const regionalAdmins = users.filter(u => u.role === 'admin');
  
  // KPIs
  const totalAdmins = regionalAdmins.length;
  const uniqueRegions = new Set(regionalAdmins.map(a => a.region).filter(Boolean)).size;
  const activeAccounts = regionalAdmins.length; // Assuming all are active for now

  setTxt('radmin-total', totalAdmins);
  setTxt('radmin-regions', uniqueRegions);
  setTxt('radmin-active', activeAccounts);

  let filtered = regionalAdmins;
  if (search) {
    const s = search.toLowerCase();
    filtered = regionalAdmins.filter(a => 
      (a.name && a.name.toLowerCase().includes(s)) ||
      (a.email && a.email.toLowerCase().includes(s)) ||
      (a.region && a.region.toLowerCase().includes(s))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="ta-center" style="padding:40px;color:#94a3b8">No regional admins found.</td></tr>';
  } else {
    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td style="padding:16px 20px;"><strong>${a.name}</strong></td>
        <td style="padding:16px 20px;">${a.email}</td>
        <td style="padding:16px 20px;"><span style="background:#e0e7ff; color:#4338ca; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600;">${a.region || 'Unassigned'}</span></td>
        <td style="padding:16px 20px;"><span style="background:#dcfce7; color:#16a34a; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600;">Active</span></td>
        <td class="ta-right" style="padding:16px 20px;">
          <button class="btn-cancel" style="padding:6px 12px; border-radius:6px;" onclick="editRegionalAdmin('${a.email}')">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  setupRegionalAdminsFilters();
}

function setupRegionalAdminsFilters() {
  const s = document.getElementById('radmin-search');
  if (s && !s.oninput) {
    s.oninput = () => renderRegionalAdmins(s.value);
  }
}

function openAddAdminModal() {
  const html = `
    <h3>Add Regional Admin</h3>
    <div style="margin:20px 0;">
      <input type="text" id="newAdminName" placeholder="Name" class="form-input" style="width:100%;margin-bottom:10px;padding:8px;" />
      <input type="email" id="newAdminEmail" placeholder="Email" class="form-input" style="width:100%;margin-bottom:10px;padding:8px;" />
      <input type="text" id="newAdminRegion" placeholder="Region (e.g. Bangalore)" class="form-input" style="width:100%;padding:8px;" />
    </div>
  `;
  openConfirmModal('New Admin', html, 'btn-primary', 'Save');
  pendingAction = async () => {
    const name = document.getElementById('newAdminName').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const region = document.getElementById('newAdminRegion').value.trim();
    
    if(!name || !email || !region) return showToast('error', 'Validation', 'All fields are required.');
    
    try {
      const res = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'super_admin' },
        body: JSON.stringify({ name, email, region, role: 'admin', phone: '+91 00000 00000', username: email.split('@')[0] + Math.floor(Math.random()*10000), password: 'password123' })
      });
      if(res.ok) {
        showToast('success', 'Admin Added', 'Regional Admin created successfully.');
        closeModal();
        await fetchData(); // Refresh table
      } else {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        showToast('error', 'Error', (errData && errData.message) ? errData.message : 'Failed to add admin. Email may already exist.');
      }
    } catch(e) {
      showToast('error', 'Error', 'Failed to connect to server');
    }
  };
}

function editRegionalAdmin(email) {
  const admin = users.find(u => u.email === email);
  if (!admin) return;
  
  const html = `
    <h3>Edit ${admin.name}</h3>
    <div style="margin:20px 0;">
      <label style="display:block;margin-bottom:5px;font-size:12px;color:#64748b;">Assigned Region</label>
      <input type="text" id="editAdminRegion" value="${admin.region || ''}" class="form-input" style="width:100%;padding:8px;" />
    </div>
  `;
  openConfirmModal('Edit Admin', html, 'btn-primary', 'Save Changes');
  pendingAction = async () => {
    const region = document.getElementById('editAdminRegion').value.trim();
    if(!region) return showToast('error', 'Error', 'Region cannot be empty');
    
    try {
      const res = await fetch(`http://localhost:3000/users/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-role': 'super_admin' },
        body: JSON.stringify({ region })
      });
      if(res.ok) {
        showToast('success', 'Admin Updated', 'Region updated successfully.');
        closeModal();
        await fetchData(); // Refresh table
      } else {
        showToast('error', 'Error', 'Failed to update admin');
      }
    } catch(e) {
      showToast('error', 'Error', 'Failed to connect to server');
    }
  };
}

function renderGlobalReports(search = '') {
  const tbody = document.getElementById('global-reports-table-body');
  if (!tbody) return;

  const registeredOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
  
  let totalProps = 0;
  let activeProps = 0;
  let pendingProps = 0;
  let totalRev = 0;

  properties.forEach(p => {
    totalProps++;
    if (p.status === 'verified' || p.status === 'approved') activeProps++;
    if (p.status === 'pending') pendingProps++;

    let ownerName = p.owner?.name || p.owner;
    let ownerEmail = p.owner?.email || p.ownerEmail || 'Unknown';
    let ownerObj = registeredOwners.find(o => (ownerName && o.name === ownerName) || (ownerEmail !== 'Unknown' && o.email === ownerEmail));
    if (!ownerObj) ownerObj = users.find(u => (ownerName && u.name === ownerName) || (ownerEmail !== 'Unknown' && u.email === ownerEmail));
    if (!ownerObj && p.owner && typeof p.owner === 'object') ownerObj = p.owner;
    
    let rev = 0;
    if (ownerObj && ownerObj.subscriptionPlan) rev = Number(ownerObj.subscriptionFee) || 0;
    else if (p.status === 'verified' || p.status === 'approved') rev = 5000;
    
    if (p.status === 'pending') rev = 0;
    totalRev += rev;
  });

  setTxt('rep-total-props', totalProps);
  setTxt('rep-active-props', activeProps);
  setTxt('rep-pending-props', pendingProps);
  setTxt('rep-total-rev', '₹' + totalRev.toLocaleString('en-IN'));

  let filteredProps = properties;
  if (search) {
    const s = search.toLowerCase();
    filteredProps = properties.filter(p => {
      let ownerEmail = p.owner?.email || p.ownerEmail || 'Unknown';
      let region = p.location || p.region || 'Unknown';
      return (p.name && p.name.toLowerCase().includes(s)) || 
             (ownerEmail && ownerEmail.toLowerCase().includes(s)) ||
             (region && region.toLowerCase().includes(s));
    });
  }

  if (filteredProps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="ta-center" style="padding:40px;color:#94a3b8">No properties found.</td></tr>';
  } else {
    tbody.innerHTML = filteredProps.map(p => {
      let ownerName = p.owner?.name || p.owner;
      let ownerEmail = p.owner?.email || p.ownerEmail || 'Unknown';
      let region = p.location || p.region || 'Unknown';

      let ownerObj = registeredOwners.find(o => (ownerName && o.name === ownerName) || (ownerEmail !== 'Unknown' && o.email === ownerEmail));
      if (!ownerObj) ownerObj = users.find(u => (ownerName && u.name === ownerName) || (ownerEmail !== 'Unknown' && u.email === ownerEmail));
      
      if (!ownerObj && p.owner && typeof p.owner === 'object') {
        ownerObj = p.owner;
      }

      let planName = 'None';
      let rev = 0;
      
      if (ownerObj && ownerObj.subscriptionPlan) {
        planName = ownerObj.subscriptionPlan;
        rev = Number(ownerObj.subscriptionFee) || 0;
      } else if (p.status === 'verified' || p.status === 'approved') {
        planName = 'Standard (Legacy)';
        rev = 5000;
      }

      if (p.status === 'pending') {
        planName = 'Pending Approval';
        rev = 0;
      }

      const stClass = (p.status === 'verified' || p.status === 'approved') ? 'status-active' : 'status-pending';
      const stBg = (p.status === 'verified' || p.status === 'approved') ? '#dcfce7' : '#fef3c7';
      const stColor = (p.status === 'verified' || p.status === 'approved') ? '#16a34a' : '#d97706';

      return `
        <tr>
          <td style="padding:16px 20px;"><strong>${p.name}</strong></td>
          <td style="padding:16px 20px;">${ownerEmail}</td>
          <td style="padding:16px 20px;">${region}</td>
          <td style="padding:16px 20px;"><span style="background:${stBg}; color:${stColor}; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600;">${p.status.toUpperCase()}</span></td>
          <td style="padding:16px 20px;">${planName}</td>
          <td class="ta-right" style="padding:16px 20px;"><strong>₹${rev.toLocaleString('en-IN')}</strong></td>
        </tr>
      `;
    }).join('');
  }
  
  const s = document.getElementById('rep-search');
  if (s) s.oninput = () => renderGlobalReports(s.value);
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
    `<div style="font-size:13px;line-height:1.6;color:#475569">${bodyHtml}</div>`;
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
function validPhone(p)  { return /^\+?[\d\s\-]{9,}$/.test(p); }
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
          owner: ownerProp.owner || 'Rajesh Kumar',
          ownerEmail: ownerProp.ownerEmail || 'rajesh.k@email.com',
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
      // The section will be re-rendered by fetchData()
    }
  } catch(e) { console.error('Error syncing owner properties:', e); }
}

// ===== USER DATA SYNC =====
function syncUsers() {
  try {
    let pendingSources = [];

    const regGuests = JSON.parse(localStorage.getItem('registered_guests'));
    if (regGuests && Array.isArray(regGuests)) pendingSources = pendingSources.concat(regGuests);

    const regOwners = JSON.parse(localStorage.getItem('registered_owners'));
    if (regOwners && Array.isArray(regOwners)) pendingSources = pendingSources.concat(regOwners);

    if (pendingSources.length === 0) return;

    let hasNew = false;
    pendingSources.forEach(u => {
      const exists = users.find(existing => existing.email === u.email || existing.id === u.id);
      if (!exists) {
        hasNew = true;
        users.push({
          id: u.id || Date.now(),
          name: u.name || 'Unknown',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role || (u.propertyName ? 'owner' : 'guest'),
          property: u.propertyName || '',
          status: u.status || 'active',
          joinDate: u.registeredOn || new Date().toISOString().split('T')[0],
          username: u.username || u.email
        });
      }
    });

    if (hasNew) {
      saveData();
    }
  } catch(e) { console.error('Error syncing users:', e); }
}
