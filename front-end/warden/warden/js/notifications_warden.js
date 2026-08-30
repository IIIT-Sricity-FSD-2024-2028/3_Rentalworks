// ===================================================
//  notifications_warden.js
//  Handles: Render, Mark Read, Delete, Badge Update
// ===================================================

function renderNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  const total  = notifications.length;
  const unread = notifications.filter(n => !n.isRead).length;
  const read   = notifications.filter(n => n.isRead).length;

  setInner('notif-total', total);
  setInner('notif-unread', unread);
  setInner('notif-read', read);
  setInner('notif-unread-count', unread);

  if (notifications.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;padding:32px;font-size:13px">No notifications yet</p>`;
    return;
  }

  container.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" id="notif-${n.id}">
      <div class="notif-icon-wrap ${n.icon}">
        ${n.icon === 'warning' ? '⚠️' : n.icon === 'check' ? '✅' : 'ℹ️'}
      </div>
      <div class="notif-content">
        <strong>${n.title}</strong>
        <p>${n.message}</p>
        <time>${n.time}</time>
      </div>
      <div class="notif-actions">
        ${!n.isRead ? '<div class="unread-dot"></div>' : ''}
        <span class="delete-notif" onclick="deleteNotification(${n.id})" title="Delete">🗑️</span>
      </div>
    </div>
  `).join('');
}

function markAllAsRead() {
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 1;
  fetch(`http://localhost:3000/notifications/user/${userId}/read`, { method: 'POST', headers: { 'x-role': 'warden', 'x-user-id': String(userId) } })
    .then(res => {
      if(res.ok) {
        notifications.forEach(n => n.isRead = true);
        renderNotifications();
        updateNotifBadge();
        showToast('success', 'All Read', 'All notifications marked as read');
      }
    });
}

function deleteNotification(id) {
  const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
  const userId = user.id || 1;
  fetch(`http://localhost:3000/notifications/${id}`, { method: 'DELETE', headers: { 'x-role': 'warden', 'x-user-id': String(userId) } })
    .then(res => {
      if(res.ok) {
        notifications = notifications.filter(n => n.id !== id);
        renderNotifications();
        updateNotifBadge();
      }
    });
}

function updateNotifBadge() {
  const navBadge  = document.getElementById('notif-badge');
  const sideBadge = document.getElementById('notif-badge-sidebar');
  const bellIcon  = document.querySelector('.navbar .material-icons-outlined:contains("notifications")'); // or similar
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (navBadge) {
    navBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    navBadge.textContent = unreadCount;
  }
  if (sideBadge) {
    sideBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    sideBadge.textContent = unreadCount;
  }

  // Bell animation based on actual unread notifications
  const bellContainer = document.querySelector('.navbar .nav-item[style*="relative"]'); 
  if (bellContainer) {
    const icon = bellContainer.querySelector('span.material-icons-outlined');
    if (icon) {
      if (unreadCount > 0) {
        icon.style.animation = 'ring 2s infinite';
      } else {
        icon.style.animation = 'none';
      }
    }
  }

  // Silent auto-read when looking at notifications page
  if (currentSection === 'notifications' && unreadCount > 0) {
    const user = JSON.parse(sessionStorage.getItem('pg_user') || '{}');
    const userId = user.id || 1;
    fetch(`http://localhost:3000/notifications/user/${userId}/read`, { method: 'POST', headers: { 'x-role': 'warden', 'x-user-id': String(userId) } })
      .then(res => {
        if (res.ok) {
          notifications.forEach(n => n.isRead = true);
          updateNotifBadge();
          setInner('notif-unread', 0);
          setInner('notif-unread-count', 0);
          setInner('notif-read', notifications.length);
          document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
          document.querySelectorAll('.unread-dot').forEach(el => el.remove());
        }
      });
  }
}
