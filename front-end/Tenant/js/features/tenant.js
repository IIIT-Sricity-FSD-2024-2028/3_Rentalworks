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

  // --- DATE UTILITIES ---
  _cmpRelativeTime(isoOrDateStr) {
    if (!isoOrDateStr) return '';
    const date = new Date(isoOrDateStr);
    if (isNaN(date.getTime())) return isoOrDateStr;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 14) return `${diffDays} days ago`;
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  _cmpDurationStr(ms) {
    if (!ms || ms < 0) return 'a moment';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (days === 0 && hours === 0) return 'less than an hour';
    if (days === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (hours === 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  },

  _cmpFormatDateTime(isoOrDateStr) {
    if (!isoOrDateStr) return '';
    const date = new Date(isoOrDateStr);
    if (isNaN(date.getTime())) return isoOrDateStr;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  _cmpFormatDate(isoOrDateStr) {
    if (!isoOrDateStr) return '';
    const date = new Date(isoOrDateStr);
    if (isNaN(date.getTime())) return isoOrDateStr;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  _cmpGetCreatedAt(c) {
    // Returns a Date object for the complaint's creation time
    if (c.createdAt) return new Date(c.createdAt);
    if (c.created) {
      const d = new Date(c.created);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(0);
  },

  // --- COMPLAINTS ---
  submitComplaint() {
    const title = document.getElementById('complaint-title').value.trim();
    const desc = document.getElementById('complaint-desc').value.trim();
    const priority = document.getElementById('complaint-priority').value;

    if (!title || !desc) return UI.showToast('Please fill all fields', 'error');

    const now = new Date().toISOString();
    State.data.complaints.unshift({
      id: Date.now(),
      title,
      desc,
      priority,
      status: 'open',
      created: new Date().toLocaleDateString(),
      createdAt: now,
      inProgressAt: null,
      resolvedAt: null,
      resolvedBy: null,
      tenantName: State.data.profile.name,
      room: State.data.profile.room || 'A-204'
    });
    State.save();
    
    // Push notification to Warden
    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'New Complaint',
      message: `Tenant reported a complaint: ${title}.`,
      type: 'warning',
      priority: priority,
      targetRole: 'warden',
      by: 'Tenant',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

    UI.closeModal('complaint-modal');
    UI.showToast('Complaint filed successfully!', 'success');
    
    document.getElementById('complaint-title').value = '';
    document.getElementById('complaint-desc').value = '';
    
    this.renderComplaints();
    this.updateDashboardStats();
  },

  _activeComplaintFilter: 'all',

  setComplaintFilter(filter) {
    this._activeComplaintFilter = filter;
    // Update active card
    document.querySelectorAll('.cmp-filter-card').forEach(el => el.classList.remove('active'));
    const cardId = filter === 'all' ? 'cmp-card-all' :
                   filter === 'open' ? 'cmp-card-open' :
                   filter === 'in-progress' ? 'cmp-card-in-progress' : 'cmp-card-resolved';
    const activeCard = document.getElementById(cardId);
    if (activeCard) activeCard.classList.add('active');
    // Update filter label
    const labelEl = document.getElementById('cmp-filter-label');
    if (labelEl) {
      const labelMap = { all: 'All Complaints', open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
      labelEl.textContent = labelMap[filter] || 'All Complaints';
    }
    this._renderComplaintsList();
  },

  renderComplaints() {
    const container = document.getElementById('complaints-list');
    if (!container) return;

    // Update counts
    const all = State.data.complaints;
    const totalEl = document.getElementById('cmp-total');
    const openEl = document.getElementById('cmp-open');
    const inprogEl = document.getElementById('cmp-inprog');
    const resolvedEl = document.getElementById('cmp-resolved');
    if (totalEl) totalEl.textContent = all.length;
    if (openEl) openEl.textContent = all.filter(c => c.status === 'open').length;
    if (inprogEl) inprogEl.textContent = all.filter(c => c.status === 'in-progress').length;
    if (resolvedEl) resolvedEl.textContent = all.filter(c => c.status === 'resolved').length;

    // Re-apply active filter card styling
    const filter = this._activeComplaintFilter || 'all';
    document.querySelectorAll('.cmp-filter-card').forEach(el => el.classList.remove('active'));
    const cardId = filter === 'all' ? 'cmp-card-all' :
                   filter === 'open' ? 'cmp-card-open' :
                   filter === 'in-progress' ? 'cmp-card-in-progress' : 'cmp-card-resolved';
    const activeCard = document.getElementById(cardId);
    if (activeCard) activeCard.classList.add('active');

    this._renderComplaintsList();
  },

  _renderComplaintsList() {
    const container = document.getElementById('complaints-list');
    if (!container) return;

    const filter = this._activeComplaintFilter || 'all';
    const all = State.data.complaints || [];

    // Filter
    let filtered = filter === 'all' ? all : all.filter(c => c.status === filter);

    // Sort newest first by createdAt or created date
    filtered = [...filtered].sort((a, b) => {
      return this._cmpGetCreatedAt(b) - this._cmpGetCreatedAt(a);
    });

    if (filtered.length === 0) {
      const labelMap = { all: 'complaints', open: 'open complaints', 'in-progress': 'in-progress complaints', resolved: 'resolved complaints' };
      const iconMap = { all: '📋', open: '🔓', 'in-progress': '⏳', resolved: '✅' };
      container.innerHTML = `
        <div class="cmp-empty-state">
          <div class="empty-icon">${iconMap[filter] || '📋'}</div>
          <h3>No ${labelMap[filter] || 'complaints'}</h3>
          <p>There are currently no ${labelMap[filter] || 'complaints'} to display.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const badgeCls = c.status === 'resolved' ? 'resolved' : c.status === 'in-progress' ? 'in-progress' : 'open';
      const badgeText = c.status === 'resolved' ? 'RESOLVED' : c.status === 'in-progress' ? 'IN PROGRESS' : 'OPEN';

      const createdAtDate = this._cmpGetCreatedAt(c);
      const filedDateStr = this._cmpFormatDate(createdAtDate.toISOString());
      const filedAgo = this._cmpRelativeTime(createdAtDate.toISOString());

      let durationHtml = '';
      const now = new Date();
      if (c.status === 'open') {
        const openMs = now - createdAtDate;
        durationHtml = `<div class="complaint-card-meta-item">🕐 Open for ${this._cmpDurationStr(openMs)}</div>`;
      } else if (c.status === 'in-progress') {
        const inProgDate = c.inProgressAt ? new Date(c.inProgressAt) : createdAtDate;
        const inProgMs = now - inProgDate;
        durationHtml = `<div class="complaint-card-meta-item">🕐 In progress for ${this._cmpDurationStr(inProgMs)}</div>`;
      } else if (c.status === 'resolved') {
        const resolvedDate = c.resolvedAt ? new Date(c.resolvedAt) : now;
        durationHtml = `<div class="complaint-card-meta-item">✓ Resolved ${this._cmpRelativeTime(resolvedDate.toISOString())}</div>`;
      }

      const actionHtml = c.status === 'resolved'
        ? `<span style="color:#16a34a;font-size:13px;font-weight:600;">✔ Resolved${c.resolvedBy ? ' by ' + c.resolvedBy : ' by Warden'}</span>`
        : `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); TenantLogic.deleteComplaint(${c.id})">Withdraw</button>`;

      return `
      <div class="complaint-card" onclick="TenantLogic.openComplaintDetails(${c.id})" id="complaint-card-${c.id}">
        <div class="complaint-card-header">
          <div class="complaint-card-title">${c.title}</div>
          <span class="cmp-badge ${badgeCls}">${badgeText}</span>
        </div>
        <div class="complaint-card-desc">${c.desc}</div>
        <div class="complaint-card-meta">
          <div class="complaint-card-meta-item">📅 Filed ${filedDateStr} · ${filedAgo}</div>
          ${durationHtml}
        </div>
        <div class="complaint-card-footer">
          ${actionHtml}
          <span style="font-size:12px;color:var(--text-muted);">Click card for details →</span>
        </div>
      </div>`;
    }).join('');
  },

  openComplaintDetails(id) {
    const c = State.data.complaints.find(x => x.id === id);
    if (!c) return;

    const now = new Date();
    const createdAtDate = this._cmpGetCreatedAt(c);
    const filedStr = this._cmpFormatDateTime(createdAtDate.toISOString());
    const filedAgo = this._cmpRelativeTime(createdAtDate.toISOString());

    const badgeCls = c.status === 'resolved' ? 'resolved' : c.status === 'in-progress' ? 'in-progress' : 'open';
    const badgeText = c.status === 'resolved' ? 'RESOLVED' : c.status === 'in-progress' ? 'IN PROGRESS' : 'OPEN';

    // Build timeline
    let timelineHtml = '';

    // Event 1: Filed
    timelineHtml += `
      <div class="cmp-timeline-item">
        <div class="cmp-timeline-dot filed">📋</div>
        <div class="cmp-timeline-content">
          <div class="cmp-timeline-event">Complaint Filed</div>
          <div class="cmp-timeline-time">${filedStr}</div>
        </div>
      </div>`;

    // Event 2: In Progress (if applicable)
    if (c.status === 'in-progress' || c.status === 'resolved') {
      const inProgDate = c.inProgressAt ? new Date(c.inProgressAt) : null;
      const inProgStr = inProgDate ? this._cmpFormatDateTime(inProgDate.toISOString()) : 'Date unavailable';

      let inProgDuration = '';
      if (c.status === 'in-progress') {
        const ms = now - (inProgDate || createdAtDate);
        inProgDuration = `<div class="cmp-timeline-duration">🕐 In progress for ${this._cmpDurationStr(ms)}</div>`;
      } else if (c.status === 'resolved' && c.resolvedAt && inProgDate) {
        const ms = new Date(c.resolvedAt) - inProgDate;
        inProgDuration = `<div class="cmp-timeline-duration">🕐 In progress for ${this._cmpDurationStr(ms)}</div>`;
      }

      timelineHtml += `
        <div class="cmp-timeline-item">
          <div class="cmp-timeline-dot in-progress">⏳</div>
          <div class="cmp-timeline-content">
            <div class="cmp-timeline-event">Moved to In Progress</div>
            <div class="cmp-timeline-time">${inProgStr}</div>
            ${inProgDuration}
          </div>
        </div>`;
    }

    // Event 3: Resolved (if applicable)
    if (c.status === 'resolved') {
      const resolvedDate = c.resolvedAt ? new Date(c.resolvedAt) : null;
      const resolvedStr = resolvedDate ? this._cmpFormatDateTime(resolvedDate.toISOString()) : 'Date unavailable';
      const resolvedBy = c.resolvedBy || 'Warden';

      timelineHtml += `
        <div class="cmp-timeline-item">
          <div class="cmp-timeline-dot resolved">✓</div>
          <div class="cmp-timeline-content">
            <div class="cmp-timeline-event">Resolved ✓</div>
            <div class="cmp-timeline-time">${resolvedStr}</div>
            <div class="cmp-timeline-duration">✓ Resolved by ${resolvedBy}</div>
          </div>
        </div>`;
    }

    // Resolution summary (for resolved complaints)
    let resolutionHtml = '';
    if (c.status === 'resolved') {
      const resolvedDate = c.resolvedAt ? new Date(c.resolvedAt) : now;
      const totalMs = resolvedDate - createdAtDate;
      resolutionHtml = `
        <div class="cmp-resolution-info">
          <div class="res-label">✓ Resolution Summary</div>
          <div class="res-row"><span>Total resolution time</span><strong>${this._cmpDurationStr(totalMs)}</strong></div>
          <div class="res-row"><span>Resolved by</span><strong>${c.resolvedBy || 'Warden'}</strong></div>
        </div>`;
    } else if (c.status === 'open') {
      const openMs = now - createdAtDate;
      resolutionHtml = `<div style="margin-top:14px;padding:10px 14px;background:var(--danger-bg);border:1px solid #fecaca;border-radius:var(--radius-md);font-size:13px;color:var(--danger);">🕐 Open for ${this._cmpDurationStr(openMs)}</div>`;
    } else if (c.status === 'in-progress') {
      const inProgDate = c.inProgressAt ? new Date(c.inProgressAt) : createdAtDate;
      const inProgMs = now - inProgDate;
      resolutionHtml = `<div style="margin-top:14px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-md);font-size:13px;color:#92400e;">🕐 In progress for ${this._cmpDurationStr(inProgMs)}</div>`;
    }

    const body = document.getElementById('complaint-details-body');
    if (body) {
      body.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:4px;">
          <div class="cmp-detail-title">${c.title}</div>
          <span class="cmp-badge ${badgeCls}">${badgeText}</span>
        </div>
        <div class="cmp-detail-section-label">Description</div>
        <div class="cmp-detail-desc">${c.desc}</div>
        <div class="cmp-detail-section-label">Filed</div>
        <div class="cmp-detail-filed">📅 ${filedStr} &nbsp;·&nbsp; ${filedAgo}</div>
        <div class="cmp-detail-section-label">Complaint Timeline</div>
        <div class="cmp-timeline">${timelineHtml}</div>
        ${resolutionHtml}
      `;
    }
    UI.openModal('complaint-details-modal');
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
      id: Date.now(), title, desc, category: State.data.selectedIssueCategory, priority: State.data.selectedPriority, status: 'open',
      tenantName: State.data.profile.name, room: State.data.profile.room || 'A-204'
    });
    State.save();

    // Push notification to Warden/Owner
    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'New Issue Reported',
      message: `Tenant reported an issue: ${title}.`,
      type: 'alert',
      priority: State.data.selectedPriority,
      targetRole: 'all',
      by: 'Tenant',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

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
      status: 'pending',
      tenantName: State.data.profile.name, 
      room: State.data.profile.room || 'A-204'
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

    // Support both Tenant-native (desc/time) and cross-actor (message/sentAt) notification formats
    container.innerHTML = notifications.map(n => {
      const displayDesc = n.desc || n.message || 'You have a new alert.';
      const displayTime = n.time || n.sentAt || 'Just now';
      const displayTitle = n.title || 'Notification';
      const displayIcon = n.icon || (n.type === 'announcement' ? '🔔' : n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️');
      const displayBg = n.bg || (n.type === 'warning' ? '#fef2f2' : n.type === 'success' ? '#f0fdf4' : '#eff6ff');

      return `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <div class="notif-icon-wrap" style="background:${displayBg}">${displayIcon}</div>
        <div class="notif-content">
          <div class="notif-title">${displayTitle} ${n.unread ? '<span class="notif-unread-dot"></span>' : ''}</div>
          <div class="notif-desc">${displayDesc}</div>
          <div class="notif-time">${displayTime}</div>
          ${n.unread ? `<div class="notif-actions" onclick="TenantLogic.markSingleRead(${n.id})">Mark Read</div>` : ''}
        </div>
      </div>`;
    }).join('');
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
      
      // Save to global_payments for Admin dashboard
      let globalPayments = JSON.parse(localStorage.getItem('global_payments') || '[]');
      globalPayments.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        tenant: State.data.profile.name,
        property: State.data.profile.pgName || 'Unknown PG',
        room: State.data.profile.roomNumber || '-',
        amount: current.amount,
        method: displayMethodName,
        transactionId: newTxnId,
        paidDate: todayDate,
        status: 'verified',
        clearance: 'Pending'
      });
      localStorage.setItem('global_payments', JSON.stringify(globalPayments));
      
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

  renderProfile() {
    const profile = State.data.profile;
    
    // Static text labels
    const pName = document.querySelector('.profile-name');
    const pEmail = document.querySelector('.profile-email');
    if (pName) pName.textContent = profile.name;
    if (pEmail) pEmail.textContent = profile.email;
    
    // Initials avatar
    const pAvatar = document.querySelector('.profile-avatar');
    if (pAvatar && profile.name) pAvatar.textContent = profile.name.charAt(0).toUpperCase();

    // Form fields
    const fUsername = document.getElementById('profile-username');
    const fName = document.getElementById('profile-name');
    const fEmail = document.querySelector('input[type="email"]');
    const fPhone = document.getElementById('profile-phone');
    const fAddress = document.getElementById('profile-address');

    if (fUsername) fUsername.value = profile.username || '';
    if (fName) fName.value = profile.name || '';
    if (fEmail) fEmail.value = profile.email || '';
    if (fPhone) fPhone.value = profile.phone || '';
    if (fAddress) fAddress.value = profile.address || '';
    
    // Hide inline username error
    const errEl = document.getElementById('username-error-msg');
    if (errEl) errEl.style.display = 'none';

    // Stats (Room and Property)
    const pRoom = document.getElementById('profile-room-val');
    const pProp = document.getElementById('profile-prop-val');
    const fProp = document.getElementById('profile-prop-assigned');
    if (pRoom) pRoom.textContent = profile.room || 'A-204';
    if (pProp) pProp.textContent = profile.property || 'Sunrise PG';
    if (fProp) fProp.value = profile.property || 'Sunrise PG';
  },

  saveProfile() {
    const usernameInput = document.getElementById('profile-username');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const address = document.getElementById('profile-address').value.trim();
    const errEl = document.getElementById('username-error-msg');
    
    if (errEl) errEl.style.display = 'none';

    if (!username) {
      if (errEl) { errEl.textContent = 'Username is required'; errEl.style.display = 'block'; }
      return UI.showToast('Username is required', 'error');
    }

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      if (errEl) { errEl.textContent = 'Username must be 3-30 characters long and contain only letters, numbers, underscores, dashes, or dots.'; errEl.style.display = 'block'; }
      return UI.showToast('Invalid username format', 'error');
    }

    if (!name) return UI.showToast('Full Name is required', 'error');

    const currentEmail = State.data.profile.email;
    const currentOldUsername = State.data.profile.username;

    // --- UNIVERSALLY UNIQUE USERNAME VALIDATION ---
    const accounts = JSON.parse(localStorage.getItem('pg_user_accounts') || '[]');
    const regGuests = JSON.parse(localStorage.getItem('registered_guests') || '[]');
    const regOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');

    const isTakenInAccounts = accounts.some(a => 
      a.username.toLowerCase() === username.toLowerCase() && 
      ((a.email && a.email.toLowerCase() !== currentEmail.toLowerCase()) || a.username.toLowerCase() !== (currentOldUsername || '').toLowerCase())
    );

    const isTakenInGuests = regGuests.some(g => 
      g.username && g.username.toLowerCase() === username.toLowerCase() && g.email?.toLowerCase() !== currentEmail.toLowerCase()
    );

    const isTakenInOwners = regOwners.some(o => 
      o.username && o.username.toLowerCase() === username.toLowerCase() && o.email?.toLowerCase() !== currentEmail.toLowerCase()
    );

    if (isTakenInAccounts || isTakenInGuests || isTakenInOwners) {
      if (errEl) { 
        errEl.textContent = `Username "${username}" is already taken by another account. Please choose a unique username.`; 
        errEl.style.display = 'block'; 
      }
      return UI.showToast(`Username "${username}" is already taken!`, 'error');
    }

    const oldName = State.data.profile.name;
    State.data.profile.username = username;
    State.data.profile.name = name;
    State.data.profile.phone = phone;
    State.data.profile.address = address;
    State.save();

    // Update persistent user accounts store in localStorage
    let updatedAccs = accounts.map(acc => {
      if ((acc.email && acc.email.toLowerCase() === currentEmail.toLowerCase()) || 
          (acc.username && acc.username.toLowerCase() === (currentOldUsername || '').toLowerCase())) {
        return { ...acc, username, name, phone, address };
      }
      return acc;
    });

    // If not found in default list, add it
    if (!updatedAccs.some(a => a.email?.toLowerCase() === currentEmail.toLowerCase())) {
      updatedAccs.push({
        username, name, email: currentEmail, phone, address, role: 'tenant', password: 'password123'
      });
    }

    localStorage.setItem('pg_user_accounts', JSON.stringify(updatedAccs));
    
    // Cascade updated name and username to existing complaints, issues, service requests & warden records
    if (oldName !== name || currentOldUsername !== username) {
      // 1. Update complaints
      let globalCmp = JSON.parse(localStorage.getItem('global_complaints') || '[]');
      globalCmp.forEach(c => {
        if (c.tenantName === oldName || c.tenantName === 'Rahul Sharma' || c.tenantName === 'Amit Sharma') {
          c.tenantName = name;
        }
      });
      localStorage.setItem('global_complaints', JSON.stringify(globalCmp));
      if (State.data.complaints) {
        State.data.complaints.forEach(c => {
          if (c.tenantName === oldName || c.tenantName === 'Rahul Sharma' || c.tenantName === 'Amit Sharma') {
            c.tenantName = name;
          }
        });
      }

      // 2. Update issues
      let globalIss = JSON.parse(localStorage.getItem('global_issues') || '[]');
      globalIss.forEach(i => {
        if (i.tenantName === oldName || i.tenantName === 'Rahul Sharma' || i.tenantName === 'Amit Sharma') {
          i.tenantName = name;
        }
      });
      localStorage.setItem('global_issues', JSON.stringify(globalIss));
      if (State.data.issues) {
        State.data.issues.forEach(i => {
          if (i.tenantName === oldName || i.tenantName === 'Rahul Sharma' || i.tenantName === 'Amit Sharma') {
            i.tenantName = name;
          }
        });
      }

      // 3. Update service requests
      let globalSrv = JSON.parse(localStorage.getItem('global_services') || '[]');
      globalSrv.forEach(s => {
        if (s.tenantName === oldName || s.tenantName === 'Rahul Sharma' || s.tenantName === 'Amit Sharma') {
          s.tenantName = name;
        }
      });
      localStorage.setItem('global_services', JSON.stringify(globalSrv));
      if (State.data.serviceRequests) {
        State.data.serviceRequests.forEach(s => {
          if (s.tenantName === oldName || s.tenantName === 'Rahul Sharma' || s.tenantName === 'Amit Sharma') {
            s.tenantName = name;
          }
        });
      }

      // 4. Update Warden's tenant records
      let wardenTenants = JSON.parse(localStorage.getItem('warden_tenants') || '[]');
      const room = State.data.profile.room || 'A-204';
      let matched = wardenTenants.find(t => t.name === oldName || t.email === currentEmail || t.room === room);
      if (matched) {
        matched.name = name;
        matched.phone = phone || matched.phone;
        matched.username = username;
        localStorage.setItem('warden_tenants', JSON.stringify(wardenTenants));

        // Notify warden of profile change
        let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
        crossNotifs.push({
          id: Date.now(),
          title: 'Tenant Profile Updated',
          message: `Tenant "${oldName}" updated their name to "${name}" (Username: @${username}).`,
          type: 'info',
          priority: 'routine',
          targetRole: 'warden',
          by: 'Tenant',
          sentAt: new Date().toLocaleString()
        });
        localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
      }
    }
    
    // Update current session & UI
    const sessionStr = sessionStorage.getItem('pg_user');
    if (sessionStr) {
      try {
        const user = JSON.parse(sessionStr);
        user.username = username;
        user.name = name;
        user.phone = phone;
        sessionStorage.setItem('pg_user', JSON.stringify(user));
        State.data.currentUser = user;
      } catch(e) {}
    }
    if (typeof Auth !== 'undefined') Auth.applyRoleBasedUI();
    
    this.renderProfile();
    UI.showToast('Profile & Username saved permanently!', 'success');
  }
};