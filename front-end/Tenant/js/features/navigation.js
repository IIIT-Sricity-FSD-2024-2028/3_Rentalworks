const Navigation = {
  async navigate(page) {
    if (!State.data.currentUser && page !== 'login') { page = 'login'; }
    UI.showLoader();

    try {
      const fileMap = {
        'report-issue': 'issues',
        'pay-methods': 'payments',
        'pay-upi': 'payments',
        'pay-card': 'payments',
        'pay-netbanking': 'payments',
        'pay-netbanking-login': 'payments',
        'pay-success': 'payments',
        'notifications': 'notification',
        'complaints': 'Complaints',
        'change-password': 'profile' // Added the new password route!
      };
      
      const fileName = fileMap[page] || page;
      const response = await fetch(`pages/${fileName}.html`);
      if (!response.ok) throw new Error("Failed to load page");
      const htmlText = await response.text();

      document.getElementById('dynamic-page-container').innerHTML = htmlText;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      
      const targetPage = document.getElementById('page-' + page);
      if (targetPage) targetPage.classList.add('active');

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const navItem = document.querySelector(`[data-page="${fileName === 'Complaints' ? 'complaints' : fileName}"]`);
      if (navItem) navItem.classList.add('active');

      State.update('currentPage', page);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      Auth.applyRoleBasedUI();
      
      // TRIGGER THE NEW DYNAMIC RENDERS
      if (page === 'dashboard' && State.data.currentUser) TenantLogic.updateDashboardStats();
      if (fileName === 'Complaints' && State.data.currentUser) TenantLogic.renderComplaints();
      if (fileName === 'issues' && State.data.currentUser) TenantLogic.renderIssues();
      if (fileName === 'services' && State.data.currentUser) TenantLogic.renderServices();
      if (fileName === 'notification' && State.data.currentUser) TenantLogic.renderNotifications();
      if (fileName === 'payments' && State.data.currentUser) TenantLogic.renderPayments();
      if (fileName === 'profile' && State.data.currentUser) TenantLogic.renderProfileSecurity();

    } catch (error) {
      console.error("Navigation Error:", error);
      UI.showToast("Error loading page", "error");
    }
    UI.hideLoader();
  }
};