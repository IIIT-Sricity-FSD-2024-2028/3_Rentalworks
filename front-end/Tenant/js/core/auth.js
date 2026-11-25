const Auth = {
  checkAuth() {
    const user = JSON.parse(sessionStorage.getItem('pg_user'));
    if (user && user.role === 'tenant') {
      State.update('currentUser', user);
      return true;
    }
    return false;
  },

  login() {
    window.location.href = '../login/login/login.html';
  },

  logout() {
    sessionStorage.removeItem('pg_user');
    State.update('currentUser', null);
    window.location.href = '../login/login/login.html';
  },

  applyRoleBasedUI() {
    const user = State.data.currentUser;
    
    // 3. LAYOUT MASKING: Hide Sidebar & Topbar on Login Page
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.topbar');
    const mainContent = document.querySelector('.main-content');

    if (!user) {
      // User is LOGGED OUT: Make Login Full Screen
      if (sidebar) sidebar.style.display = 'none';
      if (topbar) topbar.style.display = 'none';
      if (mainContent) mainContent.style.marginLeft = '0';
      return; // Stop executing further if no user
    } else {
      // User is LOGGED IN: Show standard Dashboard layout
      if (sidebar) sidebar.style.display = '';
      if (topbar) topbar.style.display = '';
      if (mainContent) mainContent.style.marginLeft = 'var(--sidebar-width)';
    }

    // 4. Role-Based Rendering for Buttons/Links
    document.querySelectorAll('[data-role]').forEach(el => {
      const allowedRoles = el.getAttribute('data-role').split(',');
      if (allowedRoles.includes('all') || allowedRoles.includes(user.role)) {
        el.style.display = ''; 
      } else {
        el.style.display = 'none'; 
      }
    });

    // Update Topbar Email
    const emailEl = document.querySelector('.topbar-left .email');
    if (emailEl) emailEl.textContent = user.email;
  }
};