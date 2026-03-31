const TenantLogic = {
  // --- DYNAMIC COUNTERS ---
  updateDashboardStats() {
    const dashComp = document.getElementById('dash-active-complaints');
    if (dashComp) dashComp.textContent = State.data.complaints.filter(c => c.status === 'open').length;

    const dashServ = document.getElementById('dash-pending-services');
    if (dashServ) dashServ.textContent = State.data.serviceRequests.filter(s => s.status === 'pending').length;

    const servPageCount = document.getElementById('dash-pending-services-count');
    if (servPageCount) servPageCount.textContent = State.data.serviceRequests.filter(s => s.status === 'pending').length;
  },

  // --- COMPLAINTS ---
  submitComplaint() {
    const title = document.getElementById('complaint-title').value.trim();
    const desc = document.getElementById('complaint-desc').value.trim();
    const priority = document.getElementById('complaint-priority').value;

    if (!title || !desc) return UI.showToast('Please fill all fields', 'error');

    State.data.complaints.unshift({
      id: Date.now(), title, desc, priority, status: 'open', created: new Date().toLocaleDateString()
    });
    State.save();
    
    UI.closeModal('complaint-modal');
    UI.showToast('Complaint filed successfully!', 'success');
    
    document.getElementById('complaint-title').value = '';
    document.getElementById('complaint-desc').value = '';
    
    this.renderComplaints();
    this.updateDashboardStats();
  },

  renderComplaints() {
    const container = document.getElementById('complaints-list');
    if (!container) return;

    document.getElementById('cmp-total').textContent = State.data.complaints.length;
    document.getElementById('cmp-open').textContent = State.data.complaints.filter(c => c.status === 'open').length;
    document.getElementById('cmp-inprog').textContent = State.data.complaints.filter(c => c.status === 'in-progress').length;
    document.getElementById('cmp-resolved').textContent = State.data.complaints.filter(c => c.status === 'resolved').length;

    if (State.data.complaints.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; color: gray;">No complaints found.</div>`;
        return;
    }

    container.innerHTML = State.data.complaints.map(c => {
      let badgeBg = c.status === 'resolved' ? '#dcfce7' : c.status === 'in-progress' ? '#fef08a' : '#fee2e2';
      let badgeColor = c.status === 'resolved' ? '#16a34a' : c.status === 'in-progress' ? '#b45309' : '#dc2626';
      
      let actionHtml = c.status === 'resolved' ? 
        `<span style="color: #16a34a; font-size: 13px; font-weight:bold;">✔ Resolved by Warden</span>` : 
        `<button class="btn btn-outline btn-sm" onclick="TenantLogic.deleteComplaint(${c.id})">Withdraw</button>`;

      return `
      <div class="complaint-item" style="border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 14px; background: white; padding: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>${c.title}</strong>
          <span style="font-size: 12px; background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 20px; font-weight:bold;">${c.status.toUpperCase()}</span>
        </div>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">${c.desc}</p>
        <div style="border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px;">
          ${actionHtml}
        </div>
      </div>
    `}).join('');
  },

  deleteComplaint(id) {
    if(confirm("Withdraw this complaint?")) {
      State.data.complaints = State.data.complaints.filter(c => c.id !== id);
      State.save();
      this.renderComplaints();
      this.updateDashboardStats();
      UI.showToast('Complaint withdrawn.', 'info');
    }
  },

  // --- ISSUES ---
  selectCategory(el, cat) {
    document.querySelectorAll('.category-item').forEach(e => e.classList.remove('selected', 'active'));
    el.classList.add('selected', 'active');
    State.data.selectedIssueCategory = cat;
  },

  selectPriority(el, p) {
    document.querySelectorAll('.priority-option').forEach(e => e.classList.remove('selected', 'low', 'medium', 'high'));
    el.classList.add('selected', p);
    State.data.selectedPriority = p;
  },

  submitIssue() {
    const title = document.getElementById('issue-title').value.trim();
    const location = document.getElementById('issue-location').value.trim();
    const desc = document.getElementById('issue-desc').value.trim();

    if (!State.data.selectedIssueCategory) return UI.showToast('Select a category', 'error');
    if (!title || !location || !desc) return UI.showToast('Fill all fields', 'error');

    State.data.issues.unshift({
      id: Date.now(), title, desc, category: State.data.selectedIssueCategory, priority: State.data.selectedPriority, status: 'open'
    });
    State.save();

    UI.showToast('Issue reported successfully!', 'success');
    Navigation.navigate('issues');
    
    document.getElementById('issue-title').value = '';
    document.getElementById('issue-location').value = '';
    document.getElementById('issue-desc').value = '';
    this.renderIssues();
  },

  renderIssues() {
    const container = document.getElementById('issues-list');
    if (!container) return;

    document.getElementById('iss-total').textContent = State.data.issues.length;
    document.getElementById('iss-open').textContent = State.data.issues.filter(i => i.status === 'open').length;
    document.getElementById('iss-inprog').textContent = State.data.issues.filter(i => i.status === 'in-progress').length;
    document.getElementById('iss-resolved').textContent = State.data.issues.filter(i => i.status === 'resolved').length;
    
    if (State.data.issues.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: gray;">No issues reported.</div>`;
        return;
    }

    container.innerHTML = State.data.issues.map(i => {
      let badgeBg = i.status === 'resolved' ? '#dcfce7' : i.status === 'in-progress' ? '#fef08a' : '#fee2e2';
      let badgeColor = i.status === 'resolved' ? '#16a34a' : i.status === 'in-progress' ? '#b45309' : '#dc2626';

      let actionHtml = i.status === 'resolved' ? 
        `<span style="color: #16a34a; font-size: 13px; font-weight:bold;">✔ Resolved by Maintenance</span>` : 
        `<button class="btn btn-outline btn-sm" onclick="TenantLogic.deleteIssue(${i.id})">Withdraw Issue</button>`;

      return `
      <div style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 10px; background: white;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap: 10px;">
            <strong style="font-size: 15px;">${i.title}</strong>
            <span style="font-size: 11px; background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${i.category}</span>
          </div>
          <span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 20px; font-weight: bold;">${i.status.toUpperCase()}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${i.desc}</p>
        <div style="border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px;">
          ${actionHtml}
        </div>
      </div>
    `}).join('');
  },

  deleteIssue(id) {
    if(confirm("Are you sure you want to withdraw this issue?")) {
      State.data.issues = State.data.issues.filter(i => i.id !== id);
      State.save();
      this.renderIssues();
      UI.showToast('Issue withdrawn successfully.', 'info');
    }
  },

  // --- SERVICES ---
  openServiceModal(serviceType) {
    const data = {
      laundry: { name: 'Laundry', timing: 'Mon-Sat, 8 AM - 6 PM', loc: 'Ground Floor', price: '₹50/kg' },
      parking: { name: 'Parking', timing: '24/7', loc: 'Basement', price: '₹500/mo' },
      games: { name: 'Indoor Games', timing: '6 AM - 11 PM', loc: '1st Floor', price: 'Free' },
      pantry: { name: 'Pantry', timing: '24/7', loc: 'Ground Floor', price: 'Free' }
    };
    const s = data[serviceType];
    
    State.data.selectedService = s.name;
    document.getElementById('modal-service-name').textContent = s.name;
    document.getElementById('modal-service-timing').textContent = "Timing: " + s.timing;
    document.getElementById('modal-service-location').textContent = "Location: " + s.loc;
    document.getElementById('modal-service-price').textContent = "Price: " + s.price;
    UI.openModal('service-info-modal');
  },

  openRequestModal() {
    UI.closeModal('service-info-modal');
    UI.openModal('service-request-modal');
  },

  submitServiceRequest() {
    const dateInput = document.getElementById('service-request-date').value;
    if(!dateInput) return UI.showToast('Please select a date', 'error');
    
    const serviceName = State.data.selectedService || 'Unknown';
    
    State.data.serviceRequests.unshift({
      id: Date.now(),
      name: serviceName,
      date: dateInput,
      status: 'pending'
    });
    State.save();

    // Push notification to Warden
    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'New Service Request',
      message: `Tenant requested ${serviceName} on ${dateInput}.`,
      type: 'info',
      priority: 'routine',
      targetRole: 'warden',
      by: 'Tenant',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

    UI.closeModal('service-request-modal');
    UI.showToast(`${serviceName} request submitted!`, 'success');
    
    document.getElementById('service-request-date').value = '';
    this.renderServices();
    this.updateDashboardStats();
  },

  renderServices() {
    const container = document.getElementById('active-services-list');
    
    const activeCount = State.data.serviceRequests.length;
    const countEl = document.getElementById('dash-pending-services-count');
    if (countEl) countEl.textContent = activeCount;

    if (!container) return;

    if (activeCount === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 20px;">No active service requests.</div>`;
      return;
    }

    const serviceDetails = {
      'Laundry': { icon: '👕', price: '₹50 per kg' },
      'Parking': { icon: '🚗', price: '₹500 / month' },
      'Indoor Games': { icon: '🎮', price: 'Included in rent' },
      'Pantry': { icon: '☕', price: 'Included in rent' }
    };

    container.innerHTML = State.data.serviceRequests.map(s => {
      const details = serviceDetails[s.name] || { icon: '🔧', price: 'Standard rates apply' };

      return `
      <div style="display:flex; align-items: flex-start; justify-content:space-between; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 12px; background: white;">
        <div style="display:flex; gap: 14px; align-items: center;">
          <div style="font-size: 24px; background: var(--primary-bg); width: 48px; height: 48px; display:flex; align-items:center; justify-content:center; border-radius: var(--radius-sm);">
            ${details.icon}
          </div>
          <div>
            <strong style="font-size: 15px; color: var(--text-primary);">${s.name} Service</strong>
            <div style="font-size:13px; color:var(--text-secondary); margin-top: 4px;">
              You requested the <strong>${s.name.toLowerCase()}</strong> service for <strong>${s.date}</strong>.
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top: 6px;">💵 Estimated Cost: ${details.price}</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
          <span style="background: #fef08a; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">${s.status.toUpperCase()}</span>
          <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 10px;" onclick="TenantLogic.cancelService(${s.id})">Cancel Request</button>
        </div>
      </div>
    `}).join('');
  },

  cancelService(id) {
    if(confirm("Are you sure you want to cancel this service request?")) {
      State.data.serviceRequests = State.data.serviceRequests.filter(s => s.id !== id);
      State.save();
      this.renderServices();
      this.updateDashboardStats();
      UI.showToast('Service request cancelled.', 'info');
    }
  },

  // --- NOTIFICATIONS ---
  renderNotifications() {
    const container = document.getElementById('notifs-list');
    if (!container) return;

    // Safety fallback in case state data is missing or corrupted
    const notifications = State.data.notifications || [];
    const unreadCount = notifications.filter(n => n.unread).length;
    
    // Update Page Stats
    const totalEl = document.getElementById('notif-page-total');
    const unreadEl = document.getElementById('notif-page-unread');
    if (totalEl) totalEl.textContent = notifications.length;
    if (unreadEl) unreadEl.textContent = unreadCount;

    // Update Sidebar Badges
    document.querySelectorAll('.notif-count').forEach(el => {
      el.textContent = unreadCount;
      el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    });

    if (notifications.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">No notifications.</div>`;
      return;
    }

    // Render with safe fallbacks to prevent 'undefined' text
    container.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <div class="notif-icon-wrap" style="background:${n.bg || '#f0fdf4'}">${n.icon || '🔔'}</div>
        <div class="notif-content">
          <div class="notif-title">${n.title || 'Notification'} ${n.unread ? '<span class="notif-unread-dot"></span>' : ''}</div>
          <div class="notif-desc">${n.desc || 'You have a new alert.'}</div>
          <div class="notif-time">${n.time || 'Just now'}</div>
          ${n.unread ? `<div class="notif-actions" onclick="TenantLogic.markSingleRead(${n.id})">Mark Read</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  markAllRead() {
    if(State.data.notifications) {
      State.data.notifications.forEach(n => n.unread = false);
      State.save();
      this.renderNotifications();
      UI.showToast('All notifications marked as read', 'success');
    }
  },

  markSingleRead(id) {
    const notif = State.data.notifications.find(n => n.id === id);
    if(notif) notif.unread = false;
    State.save();
    this.renderNotifications();
  },

  // --- PAYMENTS & PROFILE ---
  // --- PAYMENTS ---
  renderPayments() {
    const upcomingContainer = document.getElementById('upcoming-payments-list');
    const historyContainer = document.getElementById('payment-history-list');
    
    const totalPending = State.data.pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidThisMonth = State.data.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    
    const statPending = document.getElementById('stat-total-pending');
    const statPaid = document.getElementById('stat-paid-month');
    if(statPending) statPending.textContent = '₹' + totalPending.toLocaleString();
    if(statPaid) statPaid.textContent = '₹' + paidThisMonth.toLocaleString();

    if (upcomingContainer) {
      if (State.data.pendingPayments.length === 0) {
        upcomingContainer.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No pending payments! 🎉</div>';
      } else {
        upcomingContainer.innerHTML = State.data.pendingPayments.map(p => `
          <div class="payment-item">
            <div class="payment-info">
              <div class="payment-type">${p.type}</div>
              <div class="payment-sub">${p.title} <span>📅 Due: ${p.due}</span> <span class="badge badge-warning">Pending</span></div>
            </div>
            <div class="payment-right">
              <div class="payment-amount">₹${p.amount.toLocaleString()}</div>
              <button class="btn btn-primary btn-sm mt-8" onclick="TenantLogic.initPayment(${p.id})">Pay Now</button>
            </div>
          </div>
        `).join('');
      }
    }

    if (historyContainer) {
      historyContainer.innerHTML = State.data.paymentHistory.map(h => `
        <tr>
          <td>${h.type}</td>
          <td class="font-bold">₹${h.amount.toLocaleString()}</td>
          <td>${h.date}</td>
          <td>${h.method}</td>
          <td><span class="badge badge-success">Paid</span></td>
        </tr>
      `).join('');
    }
    
    // Inject CURRENT payment details into checkout screens
    if (State.data.currentPayment) {
      const p = State.data.currentPayment;
      document.querySelectorAll('.dyn-pay-amount').forEach(el => el.textContent = '₹' + p.amount.toLocaleString());
      document.querySelectorAll('.dyn-pay-type').forEach(el => el.textContent = p.type);
      document.querySelectorAll('.dyn-pay-due').forEach(el => el.textContent = p.due);
      document.querySelectorAll('.dyn-pay-btn-text').forEach(el => el.textContent = 'Pay ₹' + p.amount.toLocaleString());
    }

    // Inject LAST payment details into the SUCCESS screen
    if (State.data.lastPayment) {
      const lp = State.data.lastPayment;
      const methodText = document.getElementById('success-method-text');
      const amountText = document.getElementById('success-amount-text');
      const typeText = document.getElementById('success-type-text');
      const txnText = document.getElementById('success-txn-text');
      const dateText = document.getElementById('success-date-text');
      
      if (methodText) methodText.textContent = lp.method;
      if (amountText) amountText.textContent = '₹' + lp.amount.toLocaleString();
      if (typeText) typeText.textContent = lp.type;
      if (txnText) txnText.textContent = lp.txn;
      if (dateText) dateText.textContent = lp.date;
      document.querySelectorAll('.dyn-success-total').forEach(el => el.textContent = '₹' + lp.amount.toLocaleString());
    }
  },
  initPayment(id) {
    const payment = State.data.pendingPayments.find(p => p.id === id);
    if(!payment) return;
    
    State.data.currentPayment = payment; // Save which bill is being paid
    State.save();
    Navigation.navigate('pay-methods');
  },

  selectPaymentMethod(method) {
    document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-method="${method}"]`).classList.add('active');
    document.querySelectorAll('.payment-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + method).classList.remove('hidden');
  },
selectBank(element, bankName) {
    // 1. Find all bank buttons and reset them to the default 'outline' style
    document.querySelectorAll('.bank-btn').forEach(btn => {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    });

    // 2. Change the clicked button to the colored 'primary' style
    element.classList.remove('btn-outline');
    element.classList.add('btn-primary');

    // 3. Save the selected bank to memory (optional, but good practice!)
    State.data.selectedBank = bankName;
    State.save();
  },
 processPayment(methodType) {
    let displayMethodName = ""; 
    
    // --- 1. STRICT FORM VALIDATION ---
    if (methodType === 'upi') {
      const upiInput = document.getElementById('upi-id');
      const upiId = upiInput ? upiInput.value.trim() : '';
      
      if (!upiId || !upiId.includes('@')) {
        return UI.showToast('Please enter a valid UPI ID (e.g., name@upi)', 'error');
      }
      displayMethodName = "UPI";
      
    } else if (methodType === 'card') {
      const cardNum = document.getElementById('card-num') ? document.getElementById('card-num').value.trim() : '';
      const cardName = document.getElementById('card-name') ? document.getElementById('card-name').value.trim() : '';
      const cardExp = document.getElementById('card-exp') ? document.getElementById('card-exp').value.trim() : '';
      const cardCvv = document.getElementById('card-cvv') ? document.getElementById('card-cvv').value.trim() : '';

      // Check lengths to ensure it's a real-looking card
      if (cardNum.length < 15 || !cardName || cardExp.length < 5 || cardCvv.length < 3) {
        return UI.showToast('Please fill out all Card details correctly', 'error');
      }
      displayMethodName = "Debit/Credit Card";
      
    } else if (methodType === 'netbanking') {
      const userId = document.getElementById('nb-userid') ? document.getElementById('nb-userid').value.trim() : '';
      const pass = document.getElementById('nb-pass') ? document.getElementById('nb-pass').value.trim() : '';

      if (!userId || !pass) {
        return UI.showToast('Please enter your Bank User ID and Password', 'error');
      }
      displayMethodName = "Net Banking";
    }

    // --- 2. PROCESS THE PAYMENT IF VALIDATION PASSES ---
    UI.showLoader();
    setTimeout(() => {
      UI.hideLoader();
      
      const current = State.data.currentPayment;
      if(!current) return;

      const newTxnId = 'TXN' + Math.floor(Math.random() * 1000000000);
      const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      // Add to History
      State.data.paymentHistory.unshift({
        id: Date.now(), type: current.type, amount: current.amount, date: todayDate, method: displayMethodName, txn: newTxnId
      });
      
      // Save success details to memory for the success page
      State.data.lastPayment = {
        amount: current.amount, method: displayMethodName, type: current.type, txn: newTxnId, date: todayDate
      };

      // Remove from Pending & Clear current
      State.data.pendingPayments = State.data.pendingPayments.filter(p => p.id !== current.id);
      State.data.currentPayment = null;
      State.save();
      
      // Push notification to Warden
      let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
      crossNotifs.push({
        id: Date.now(),
        title: 'Payment Received',
        message: `Tenant paid ₹${current.amount.toLocaleString()} for ${current.type} via ${displayMethodName}.`,
        type: 'update',
        priority: 'important',
        targetRole: 'warden',
        by: 'Tenant',
        sentAt: new Date().toLocaleString()
      });
      localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

      // Navigate to success page
      Navigation.navigate('pay-success');
    }, 1500);
  },
  // --- PROFILE SECURITY ---
  renderProfileSecurity() {
    // Dynamic 2FA Button Check
    const btn2FA = document.getElementById('btn-2fa');
    if (btn2FA) {
      if (State.data.profile.twoFactorEnabled) {
        btn2FA.textContent = 'Enabled ✓';
        btn2FA.style.background = 'var(--success)';
        btn2FA.style.color = 'white';
        btn2FA.style.borderColor = 'var(--success)';
      } else {
        btn2FA.textContent = 'Enable';
        btn2FA.style.background = 'var(--primary)';
      }
    }
  },

  toggle2FA() {
    State.data.profile.twoFactorEnabled = !State.data.profile.twoFactorEnabled;
    State.save();
    this.renderProfileSecurity();
    
    if (State.data.profile.twoFactorEnabled) {
      UI.showToast('Two-Factor Authentication Enabled! 🔒', 'success');
    } else {
      UI.showToast('Two-Factor Authentication Disabled.', 'info');
    }
  },

  submitPasswordChange() {
    const newPass = document.getElementById('new-password').value;
    const confPass = document.getElementById('confirm-password').value;

    if(!newPass || !confPass) return UI.showToast('Please fill all fields', 'error');
    if(newPass !== confPass) return UI.showToast('New passwords do not match!', 'error');
    if(newPass.length < 6) return UI.showToast('Password too short', 'error');

    UI.showLoader();
    setTimeout(() => {
      UI.hideLoader();
      UI.showToast('Password updated successfully! 🔑', 'success');
      Navigation.navigate('profile');
      
      // Clear fields
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    }, 1000);
  },

  saveProfile() {
    // existing save profile...
    const name = document.getElementById('profile-name').value.trim();
    if (!name) return;
    State.data.profile.name = name;
    State.save();
    UI.showToast('Profile saved!', 'success');
  }
};