document.addEventListener('DOMContentLoaded', () => {
  State.init();

  if (Auth.checkAuth()) {
    Auth.applyRoleBasedUI();
    Navigation.navigate(State.data.currentPage || 'dashboard');
  } else {
    // Force to login immediately on first load
    Auth.login();
  }

  // Global Click Listeners
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) UI.closeModal(e.target.id);
    if (e.target.id === 'login-btn') Auth.login();
    if (e.target.closest('.logout-btn')) Auth.logout();
    if (e.target.closest('#save-profile-btn')) TenantLogic.saveProfile();
  });

  // Cross-actor live notifications listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'cross_notifications') {
      const notifs = JSON.parse(e.newValue || '[]');
      if (notifs.length === 0) return;
      const latest = notifs[notifs.length - 1];
      if (latest.targetRole === 'tenant' || latest.targetRole === 'all') {
        if (typeof UI !== 'undefined') UI.showToast('🔔 ' + latest.title + ': ' + latest.message, 'info');
      }
    }
  });
});