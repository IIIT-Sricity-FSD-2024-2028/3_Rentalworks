// notifications.js
let allNotifications = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('notifications', 'Notifications', 'Stay updated with your properties');
  await loadNotifications();
});

async function loadNotifications() {
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 3; // admin/owner
  try {
    const res = await fetch(`http://localhost:3000/notifications/user/${userId}`, {
      headers: {
        'x-role': 'owner',
        'x-user-id': String(userId)
      }
    });
    if (res.ok) {
      allNotifications = await res.json();
    } else {
      allNotifications = [];
    }
  } catch(e) {
    console.error('Failed to load notifications from backend', e);
    const data = await fetchData();
    allNotifications = data.notifications || [];
  }
  renderNotificationsPage(allNotifications);
}

function renderNotificationsPage(notifications) {
  const unread = notifications.filter(n => !n.read).length;

  document.getElementById('pageContent').innerHTML = `
    <!-- Header actions -->
    <div class="flex-between mb-20">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:14px;color:var(--text-muted)">${unread} unread of ${notifications.length} total</div>
        ${unread > 0 ? `<span class="badge" style="background:var(--primary-light);color:var(--primary)">${unread} new</span>` : ''}
      </div>
      <div style="display:flex;gap:10px">
        ${unread > 0 ? `<button class="btn btn-secondary" onclick="markAllRead()"><span class="material-icons" style="font-size:16px;vertical-align:middle">done_all</span> Mark All Read</button>` : ''}
        ${notifications.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="clearAllNotifications()"><span class="material-icons" style="font-size:16px;vertical-align:middle">delete_sweep</span> Clear All</button>` : ''}
        <button class="btn btn-primary" onclick="openAddNotifModal()"><span class="material-icons" style="font-size:16px;vertical-align:middle">add</span> Add</button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" id="tab-all" onclick="filterNotifs('all')">All (${notifications.length})</button>
      <button class="btn btn-secondary btn-sm" id="tab-unread" onclick="filterNotifs('unread')">Unread (${unread})</button>
      <button class="btn btn-secondary btn-sm" id="tab-alert" onclick="filterNotifs('alert')">Alerts</button>
      <button class="btn btn-secondary btn-sm" id="tab-success" onclick="filterNotifs('success')">Success</button>
      <button class="btn btn-secondary btn-sm" id="tab-reminder" onclick="filterNotifs('reminder')">Reminders</button>
    </div>

    <!-- Notifications -->
    <div id="notifList">
      ${renderNotifList(notifications)}
    </div>
  `;
}

function renderNotifList(notifications) {
  if (notifications.length === 0) return `<div class="empty-state">...</div>`;
  
  return notifications.map(n => `
    <div class="notif-card ${!n.read ? 'unread' : ''}" id="notif-${n.id}">
      <div class="notif-body" style="flex:1">
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" style="background:var(--bg-main); font-size:10px">FROM: ${n.sender || n.by || 'System'}</span>
          <div class="notif-title">${n.title}</div>
        </div>
        <div class="notif-msg">${n.message || n.desc || n.msg || 'No details available.'}</div>
        <div class="notif-date"><span class="material-icons" style="font-size:14px;vertical-align:middle">calendar_today</span> ${formatDate(n.date || n.sentAt)}</div>
      </div>
      <div class="notif-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="deleteNotif('${n.id}')"><span class="material-icons" style="font-size:18px">delete</span></button>
      </div>
    </div>
  `).join('');
}

let currentFilter = 'all';

function filterNotifs(type) {
  currentFilter = type;
  // Update tab styles
  ['all', 'unread', 'alert', 'success', 'reminder'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) { btn.className = type === t ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'; }
  });

  let filtered = allNotifications;
  if (type === 'unread') filtered = allNotifications.filter(n => !n.read);
  else if (type !== 'all') filtered = allNotifications.filter(n => n.type === type);

  const list = document.getElementById('notifList');
  if (list) list.innerHTML = renderNotifList(filtered);
}

async function markRead(id) {
  // Silent auto-read handled in backend or single notification
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 3;
  fetch(`http://localhost:3000/notifications/user/${userId}/read`, { method: 'POST', headers: { 'x-role': 'owner' } }).then(() => {
    const idx = allNotifications.findIndex(n => String(n.id) === String(id));
    if (idx !== -1) allNotifications[idx].isRead = true;

    const card = document.getElementById(`notif-${id}`);
    if (card) {
      card.classList.remove('unread');
      card.querySelector('.unread-dot')?.remove();
    }
    showToast('Marked as read', 'success');
    filterNotifs(currentFilter);
    loadSidebarBadges();
    renderNotificationsPage(allNotifications);
  });
}

async function markAllRead() {
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 3;
  fetch(`http://localhost:3000/notifications/user/${userId}/read`, { method: 'POST', headers: { 'x-role': 'owner' } }).then(() => {
    allNotifications.forEach(n => n.isRead = true);
    showToast('All notifications marked as read', 'success');
    loadSidebarBadges();
    renderNotificationsPage(allNotifications);
  });
}

function deleteNotif(id) {
  const notif = allNotifications.find(n => String(n.id) === String(id));
  if (!notif) return;
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 3;
  confirmDialog('Delete Notification', `Delete "<strong>${notif.title}</strong>"?`, () => {
    fetch(`http://localhost:3000/notifications/${id}`, { 
      method: 'DELETE', 
      headers: { 'x-role': 'owner', 'x-user-id': String(userId) } 
    }).then(() => {
      allNotifications = allNotifications.filter(n => String(n.id) !== String(id));
      closeModal();
      showToast('Notification deleted', 'success');
      loadSidebarBadges();
      renderNotificationsPage(allNotifications);
    });
  });
}

function clearAllNotifications() {
  if (allNotifications.length === 0) return;
  confirmDialog('Clear All Notifications', 'Delete all notifications? This cannot be undone.', () => {
    const data = getData();
    data.notifications = [];
    updateData(data);
    allNotifications = [];
    closeModal();
    showToast('All notifications cleared', 'success');
    loadSidebarBadges();
    renderNotificationsPage([]);
  });
}

function openAddNotifModal() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle">campaign</span> Send Notification</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label class="form-label">Recipient <span class="req">*</span></label>
        <select class="form-input" id="newNotifRecipient">
          <option value="Warden">Warden</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Title <span class="req">*</span></label>
        <input class="form-input" id="newNotifTitle" placeholder="Enter title">
      </div>
      <div class="form-group">
        <label class="form-label">Message <span class="req">*</span></label>
        <textarea class="form-input" id="newNotifMsg" rows="3" placeholder="Message content..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitNewNotif()"><span class="material-icons" style="font-size:16px;vertical-align:middle">send</span> Send Notification</button>
    </div>
  `);
}

function submitNewNotif() {
  const title = document.getElementById('newNotifTitle').value.trim();
  const message = document.getElementById('newNotifMsg').value.trim();
  const recipient = document.getElementById('newNotifRecipient').value;
  
  if (!title || !message) { showToast('Please fill all fields', 'error'); return; }

  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 3;

  if (recipient === 'Warden') {
    fetch(`http://localhost:3000/notifications/owner-to-warden`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'x-role': 'owner',
        'x-user-id': String(userId)
      },
      body: JSON.stringify({ 
        title: `To Warden: ${title}`, 
        message, 
        type: 'info', 
        priority: 'medium',
        ownerId: userId,
        recipientId: 0, // Ignored by backend as it resolves based on property
        byUserId: userId
      })
    }).then(res => {
      if(res.ok) {
        closeModal();
        showToast(`Message sent to Warden`, 'success');
        loadNotifications();
      } else {
        showToast(`Failed to send to Warden`, 'error');
      }
    });
  } else {
    // Other mock sending logic or fallback
    closeModal();
    showToast(`Message sent to Admin`, 'success');
  }
}