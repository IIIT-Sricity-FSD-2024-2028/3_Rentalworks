// ===================================================
//  violations_warden.js
//  Handles: Render Violations, Issue Warning, Escalate
// ===================================================

function renderViolations(filter = 'all') {
  const tbody = document.getElementById('violations-tbody');
  if (!tbody) return;

  let filtered = filter === 'all' ? violations : violations.filter(v => v.severity === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:24px">No violations found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(v => `
      <tr>
        <td>${v.tenant}</td>
        <td><span class="room-badge">${v.room}</span></td>
        <td>${v.type}</td>
        <td><span class="badge badge-${v.severity}">⚠️ ${capitalize(v.severity)}</span></td>
        <td><span class="badge-warnings badge" style="background:#fef9c3;color:#b45309">${v.warnings} warning${v.warnings > 1 ? 's' : ''}</span></td>
        <td>${v.date}</td>
        <td>
          <div class="action-icons">
            <button class="btn-issue-warning" onclick="issueWarning('${v.id}')">Issue Warning</button>
            ${v.escalated 
              ? `<button class="btn-escalate" style="background:#f3f4f6;color:#9ca3af;border-color:#e5e7eb;cursor:not-allowed" disabled>Escalated ✓</button>`
              : `<button class="btn-escalate" onclick="escalateViolation('${v.id}')">↑ Escalate</button>`
            }
          </div>
        </td>
      </tr>
    `).join('');
  }

  const total  = violations.length;
  const high   = violations.filter(v => v.severity === 'high').length;
  const medium = violations.filter(v => v.severity === 'medium').length;
  const low    = violations.filter(v => v.severity === 'low').length;
  setInner('viol-total', total);
  setInner('viol-high', high);
  setInner('viol-medium', medium);
  setInner('viol-low', low);
}

function issueWarning(id) {
  const v = violations.find(v => String(v.id) === String(id));
  if (!v) return;
  v.warnings++;
  saveToStorage();
  renderViolations();
  showToast('warning', 'Warning Issued', `Warning issued to ${v.tenant} for ${v.type}`);

  if (v.warnings >= 3) {
    escalateViolation(v.id);
  }
}

function escalateViolation(id) {
  const v = violations.find(v => String(v.id) === String(id));
  if (!v || v.escalated) return;

  const newNotif = {
    id: Date.now(),
    title: 'Violation Escalated',
    message: `${v.tenant} (Room ${v.room}) details sent to owner.`,
    time: 'Just now',
    read: false,
    icon: 'warning'
  };

  notifications.unshift(newNotif);

  // Notify Owner via cross-notifications
  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  const escalateId = Date.now();
  crossNotifs.push({
    id: escalateId,
    title: 'Violation Escalated by Warden',
    message: `Rule Violation by ${v.tenant} (Room ${v.room}) for "${v.type}" requires your attention.`,
    type: 'warning',
    priority: 'high',
    targetRole: 'owner',
    by: 'Warden',
    sentAt: new Date().toISOString()
  });

  // Push the escalated violation into global_issues for the Owner
  let globalIss = JSON.parse(localStorage.getItem('global_issues') || '[]');
  const escId = 'esc_viol_' + v.id;
  const alreadyEscalated = globalIss.some(i => String(i.id) === escId);
  if (!alreadyEscalated) {
    globalIss.unshift({
      id: escId,
      title: 'Rule Violation: ' + v.type,
      desc: `Rule violation escalated from Warden. Severity: ${v.severity}. Warnings issued: ${v.warnings}.`,
      category: 'Violation',
      priority: v.severity === 'high' ? 'high' : (v.severity === 'medium' ? 'medium' : 'low'),
      status: 'open',
      tenantName: v.tenant || 'Tenant',
      room: v.room || '',
      propertyName: 'Default Property',
      reportedDate: new Date().toISOString().split('T')[0],
      _escalatedByWarden: true
    });
    localStorage.setItem('global_issues', JSON.stringify(globalIss));
  }

  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  v.escalated = true; // Mark as escalated
  saveToStorage();
  updateNotifBadge();
  renderViolations(); // Update the UI button

  if (currentSection === 'notifications') {
    renderNotifications();
  }

  showToast('warning', 'Escalated to Owner', 'Violation has been sent to the Property Owner and will appear in their Issues page.');
}

// ----- Filter Setup -----
function setupViolationFilter() {
  const violFilter = document.getElementById('violation-filter');
  if (violFilter) {
    violFilter.addEventListener('change', () => renderViolations(violFilter.value));
  }
}

// ----- Add Violation -----
function openAddViolationModal() {
  const currentTenants = JSON.parse(localStorage.getItem('warden_tenants') || '[]');
  
  showModal('Add Rule Violation', `
    <div class="form-group">
      <label>Tenant Name *</label>
      <div class="input-wrapper">
        <input type="text" id="new-viol-tenant-name" list="tenant-names" placeholder="e.g. Amit Sharma" />
      </div>
      <datalist id="tenant-names">
        ${currentTenants.map(t => `<option value="${t.name}">`).join('')}
      </datalist>
      <div class="error-msg" id="err-new-viol-tenant-name"></div>
    </div>
    <div class="form-group">
      <label>Room Number *</label>
      <div class="input-wrapper">
        <input type="text" id="new-viol-room" list="tenant-rooms" placeholder="e.g. 101" />
      </div>
      <datalist id="tenant-rooms">
        ${[...new Set(currentTenants.map(t => t.room))].map(r => `<option value="${r}">`).join('')}
      </datalist>
      <div class="error-msg" id="err-new-viol-room"></div>
    </div>
    <div class="form-group">
      <label>Violation Type *</label>
      <div class="input-wrapper"><input type="text" id="new-viol-type" placeholder="e.g. Late Night Entry, Noise Complaint" /></div>
      <div class="error-msg" id="err-new-viol-type"></div>
    </div>
    <div class="form-group">
      <label>Severity *</label>
      <select id="new-viol-severity" class="filter-select" style="width:100%">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
  `, () => {
    // Clear previous errors
    ['err-new-viol-tenant-name', 'err-new-viol-room', 'err-new-viol-type'].forEach(id => {
      const el = document.getElementById(id);
      if(el) { el.textContent = ''; el.classList.remove('show'); }
    });

    const tenantName = document.getElementById('new-viol-tenant-name').value.trim();
    const room = document.getElementById('new-viol-room').value.trim();
    const type = document.getElementById('new-viol-type').value.trim();
    const severity = document.getElementById('new-viol-severity').value;

    let valid = true;
    if (!tenantName) { showFieldError('err-new-viol-tenant-name', 'Tenant name is required'); valid = false; }
    if (!room) { showFieldError('err-new-viol-room', 'Room number is required'); valid = false; }
    if (!type) { showFieldError('err-new-viol-type', 'Violation type is required'); valid = false; }
    
    // Return false to prevent modal from closing if invalid
    if (!valid) return false;

    const newViolId = Date.now();
    violations.unshift({
      id: newViolId,
      tenant: tenantName,
      room: room,
      type: type,
      severity: severity,
      warnings: 1,
      date: new Date().toLocaleDateString()
    });

    saveToStorage();
    renderViolations();
    showToast('success', 'Violation Added', `Added ${type} for ${tenantName}`);

    if (severity === 'high') {
      setTimeout(() => escalateViolation(newViolId), 500);
    }
  });
}
