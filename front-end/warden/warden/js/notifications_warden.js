// ===================================================
//  notifications_warden.js
//  Handles: Render, Mark Read, Delete, Badge Update
// ===================================================

function renderNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  const total  = notifications.length;
  const unread = notifications.filter(n => !n.read).length;
  const read   = notifications.filter(n => n.read).length;

  setInner('notif-total', total);
  setInner('notif-unread', unread);
  setInner('notif-read', read);
  setInner('notif-unread-count', unread);

  if (notifications.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;padding:32px;font-size:13px">No notifications yet</p>`;
    return;
  }

  container.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" id="notif-${n.id}">
      <div class="notif-icon-wrap ${n.icon}">
        ${n.icon === 'warning' ? '⚠️' : n.icon === 'check' ? '✅' : 'ℹ️'}
      </div>
      <div class="notif-content">
        <strong>${n.title}</strong>
        <p>${n.message}</p>
        <time>${n.time}</time>
      </div>
      <div class="notif-actions">
        ${!n.read ? '<div class="unread-dot"></div>' : ''}
        <span class="delete-notif" onclick="deleteNotification(${n.id})" title="Delete">🗑️</span>
      </div>
    </div>
  `).join('');
}

function markAllAsRead() {
  notifications.forEach(n => n.read = true);
  saveToStorage();
  renderNotifications();
  updateNotifBadge();
  showToast('success', 'All Read', 'All notifications marked as read');
}

function deleteNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveToStorage();
  renderNotifications();
  updateNotifBadge();
}

function updateNotifBadge() {
  const navBadge  = document.getElementById('notif-badge');
  const sideBadge = document.getElementById('notif-badge-sidebar');
  const unreadCount = notifications.filter(n => !n.read).length;

  if (navBadge) {
    navBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    navBadge.textContent = unreadCount;
  }
  if (sideBadge) {
    sideBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    sideBadge.textContent = unreadCount;
  }
}
