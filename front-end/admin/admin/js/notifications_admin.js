// ===================================================
//  notifications_admin.js
//  Handles: Platform Announcements, Recipients,
//           Priority Levels, Schedule Send, History
// ===================================================

function renderNotifications() {
  // Dynamic recipient counts from actual arrays
  const totalUsers   = users.length;
  const totalTenants = users.filter(u => u.role === 'tenant').length;
  const totalOwners  = users.filter(u => u.role === 'owner').length;
  const totalWardens = users.filter(u => u.role === 'warden').length;

  setTxt('rec-all-count',     totalUsers);
  setTxt('rec-tenants-count', totalTenants);
  setTxt('rec-owners-count',  totalOwners);
  setTxt('rec-wardens-count', totalWardens);

  const totalSent = notifHistory.length;
  const totalReach = notifHistory.reduce((s, n) => s + (n.recipients || 0), 0);
  setTxt('ns-total-sent', totalSent);
  setTxt('ns-reach',      totalReach.toLocaleString());

  renderNotifHistory();
  setupNotifUI();
}

function renderNotifHistory() {
  const c = document.getElementById('notif-history-list');
  if (!c) return;

  if (notifHistory.length === 0) {
    c.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:24px;font-size:13px">No announcements sent yet</p>';
    return;
  }

  c.innerHTML = notifHistory.map(n => `
    <div class="nh-item">
      <div class="nh-icon ${n.type}">
        ${n.type === 'announcement' ? '🔔' : n.type === 'update' ? '📤' : '✉️'}
      </div>
      <div class="nh-content">
        <strong>${n.title}</strong>
        ${n.priority ? `<span style="font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600;margin-left:6px;background:${getPriorityBg(n.priority)};color:${getPriorityColor(n.priority)}">${cap(n.priority)}</span>` : ''}
        <p>${n.message}</p>
        <div class="nh-meta">
          <span>👥 ${(n.recipients || 0).toLocaleString()} recipients</span>
          <span>Sent: ${n.sentAt}</span>
          <span>By: ${n.by}</span>
          ${n.scheduled ? `<span style="color:#7c3aed">📅 Scheduled</span>` : ''}
        </div>
      </div>
      <span class="nh-type-badge ${n.type}">${cap(n.type)}</span>
    </div>
  `).join('');
}

function getPriorityBg(p) {
  if (p === 'urgent')    return '#fee2e2';
  if (p === 'important') return '#fef9c3';
  return '#f1f5f9';
}

function getPriorityColor(p) {
  if (p === 'urgent')    return '#dc2626';
  if (p === 'important') return '#b45309';
  return '#64748b';
}

// ===== SEND ANNOUNCEMENT =====
// Global targeting variables for cascading dropdowns
let targetRole = 'all';
let targetPG = 'all';
let targetUser = 'all';
let finalRecipientCount = 0;

function sendNotification() {
  const title   = document.getElementById('notif-title')?.value.trim();
  const message = document.getElementById('notif-message')?.value.trim();

  if (!title)   { showToast('error', 'Missing Title',   'Enter an announcement title');   return; }
  if (!message) { showToast('error', 'Missing Message', 'Enter an announcement message'); return; }
  if (finalRecipientCount === 0) { showToast('error', 'No Recipients', 'Your current filters select 0 users.'); return; }

  const newNotif = {
    id:         Date.now(),
    title,
    message,
    type:       selectedNotifType || 'announcement',
    priority:   selectedPriority || 'routine',
    targetRole: targetRole || 'all',
    recipients: finalRecipientCount,
    sentAt:     new Date().toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }),
    by:        'Admin',
    scheduled: false
  };

  notifHistory.unshift(newNotif);
  saveData();

  // Push to cross-actor simulation system
  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  crossNotifs.push(newNotif);
  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  renderNotifHistory();

  document.getElementById('notif-title').value   = '';
  document.getElementById('notif-message').value = '';
  setTxt('ns-total-sent', notifHistory.length);
  showToast('success', 'Announcement Sent', `Broadcast to ${finalRecipientCount} users`);
}

// ===== SCHEDULE SEND =====
function scheduleNotification() {
  const title    = document.getElementById('notif-title')?.value.trim();
  const message  = document.getElementById('notif-message')?.value.trim();
  const dateTime = document.getElementById('notif-schedule-dt')?.value;

  if (!title)    { showToast('error', 'Missing Title',    'Enter an announcement title');   return; }
  if (!message)  { showToast('error', 'Missing Message',  'Enter an announcement message'); return; }
  if (!dateTime) { showToast('error', 'No Schedule Time', 'Pick a date and time to schedule'); return; }
  if (finalRecipientCount === 0) { showToast('error', 'No Recipients', 'Your current filters select 0 users.'); return; }

  const scheduled = {
    id:         Date.now(),
    title,
    message,
    type:       selectedNotifType || 'announcement',
    priority:   selectedPriority || 'routine',
    recipients: finalRecipientCount,
    sentAt:     new Date(dateTime).toLocaleString('en-IN'),
    by:        'Admin',
    scheduled: true
  };

  notifHistory.unshift(scheduled);
  saveData();
  renderNotifHistory();

  document.getElementById('notif-title').value   = '';
  document.getElementById('notif-message').value = '';
  document.getElementById('notif-schedule-dt').value = '';
  showToast('info', 'Announcement Scheduled', `Will be sent to ${finalRecipientCount} users at the scheduled time`);
}

// ===== CASCADING DROPDOWN LOGIC =====
function populatePGDropdown() {
  const pgSelect = document.getElementById('target-pg');
  pgSelect.innerHTML = '<option value="all">All Properties</option>';
  
  // FIXED: We now pull directly from the 'properties' array!
  // This completely ignores fake names like "Multiple Properties" from owners.
  properties.forEach(pg => {
    pgSelect.innerHTML += `<option value="${pg.name}">${pg.name}</option>`;
  });
}

function populateUserDropdown() {
  const userSelect = document.getElementById('target-user');
  userSelect.innerHTML = '<option value="all">All Members in this PG</option>';
  
  const filteredUsers = users.filter(u => u.role === targetRole && u.property === targetPG);
  filteredUsers.forEach(u => {
    userSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`;
  });
}

function calculateRecipients() {
  let filtered = users;
  if (targetRole !== 'all') filtered = filtered.filter(u => u.role === targetRole);
  if (targetRole !== 'all' && targetPG !== 'all') filtered = filtered.filter(u => u.property === targetPG);
  if (targetPG !== 'all' && targetUser !== 'all') filtered = filtered.filter(u => u.id == targetUser);
  
  finalRecipientCount = filtered.length;
}

// ===== UI SETUP =====
function setupNotifUI() {
  // Notification type buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedNotifType = btn.dataset.type;
    };
  });

  // Priority buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = btn.dataset.priority;
    };
  });

  // Cascading Dropdown Event Listeners
  const roleSelect = document.getElementById('target-role');
  const pgSelect = document.getElementById('target-pg');
  const userSelect = document.getElementById('target-user');

  if(roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      targetRole = e.target.value;
      targetPG = 'all'; 
      targetUser = 'all';
      pgSelect.value = 'all';
      userSelect.value = 'all';
      
      if (targetRole === 'tenant' || targetRole === 'warden') {
        pgSelect.style.display = 'block';
        userSelect.style.display = 'none';
        populatePGDropdown();
      } else {
        pgSelect.style.display = 'none';
        userSelect.style.display = 'none';
      }
      calculateRecipients();
    });
  }

  if(pgSelect) {
    pgSelect.addEventListener('change', (e) => {
      targetPG = e.target.value;
      targetUser = 'all';
      userSelect.value = 'all';

      if (targetPG !== 'all') {
        userSelect.style.display = 'block';
        populateUserDropdown();
      } else {
        userSelect.style.display = 'none';
      }
      calculateRecipients();
    });
  }

  if(userSelect) {
    userSelect.addEventListener('change', (e) => {
      targetUser = e.target.value;
      calculateRecipients();
    });
  }

  // Initial calculation on page load
  calculateRecipients();
}
