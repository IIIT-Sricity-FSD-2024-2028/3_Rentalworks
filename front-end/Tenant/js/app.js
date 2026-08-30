document.addEventListener('DOMContentLoaded', () => {
  State.init();

  if (Auth.checkAuth()) {
    Auth.applyRoleBasedUI();
    Navigation.navigate(State.data.currentPage || 'dashboard');
  } else {
    // Force to login immediately on first load
    Auth.login();
  }

  // Sidebar toggle & backdrop overlay setup
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  
  const toggleSidebar = () => {
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  if (backdrop) backdrop.addEventListener('click', () => {
    if (sidebar) sidebar.classList.remove('open');
    backdrop.classList.remove('active');
  });

  // Global Click Listeners
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) UI.closeModal(e.target.id);
    if (e.target.id === 'login-btn') Auth.login();
    if (e.target.closest('.logout-btn')) Auth.logout();
    if (e.target.closest('#save-profile-btn')) TenantLogic.saveProfile();
    if (e.target.closest('.nav-item')) {
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      }
    }
  });

  // Cross-actor live notifications listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'cross_notifications') {
      const notifs = JSON.parse(e.newValue || '[]');
      if (notifs.length === 0) return;
      const latest = notifs[notifs.length - 1];
      if (latest.targetRole === 'tenant' || latest.targetRole === 'all') {
        // If a targetUser is specified, ensure it matches the current logged in tenant
        if (latest.targetUser && State.data.profile.name && latest.targetUser.toLowerCase() !== State.data.profile.name.toLowerCase()) {
            return;
        }

        if (typeof UI !== 'undefined') UI.showToast('🔔 ' + latest.title + ': ' + latest.message, 'info');
        
        // Push to local notifications state (with deduplication)
        if (State.data && State.data.notifications) {
          const alreadyExists = State.data.notifications.some(n => n.id === latest.id);
          if (!alreadyExists) {
            const iconMap = {
              'announcement': '🔔',
              'warning': '⚠️',
              'success': '✅',
              'update': '📤',
              'alert': '🚨',
              'info': 'ℹ️'
            };
            const bgMap = {
              'warning': '#fef2f2',
              'success': '#f0fdf4',
              'announcement': '#fef9c3',
              'update': '#eff6ff',
              'alert': '#fef2f2'
            };
            State.data.notifications.unshift({
              id: latest.id,
              type: latest.type || 'info',
              icon: iconMap[latest.type] || 'ℹ️',
              bg: bgMap[latest.type] || '#eff6ff',
              title: latest.title,
              desc: latest.message,
              time: latest.sentAt || new Date().toLocaleString(),
              unread: true
            });
            localStorage.setItem('pgRentalState', JSON.stringify(State.data));
          }
          
          // Always refresh badge & notification list
          const unreadCount = State.data.notifications.filter(n => n.unread).length;
          document.querySelectorAll('.notif-count').forEach(el => {
            el.textContent = unreadCount;
            el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
          });

          // Refresh notifications page if currently open
          if (State.data.currentPage === 'notifications' || State.data.currentPage === 'notification') {
            if (typeof TenantLogic !== 'undefined' && typeof TenantLogic.renderNotifications === 'function') {
              TenantLogic.renderNotifications();
            }
          }
        }
      }
    }
    
    // Auto-refresh data if warden or owner updates complaints/issues/services
    if (['global_complaints', 'global_issues', 'global_services'].includes(e.key)) {
      State.init();
      const cp = State.data.currentPage;
      if (cp === 'dashboard') TenantLogic.updateDashboardStats();
      if (cp === 'complaints') TenantLogic.renderComplaints();
      if (cp === 'issues') TenantLogic.renderIssues();
      if (cp === 'services') TenantLogic.renderServices();
    }
  });
});