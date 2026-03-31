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
            <button class="btn-issue-warning" onclick="issueWarning(${v.id})">Issue Warning</button>
            <button class="btn-escalate" onclick="escalateViolation(${v.id})">↑ Escalate</button>
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
  const v = violations.find(v => v.id === id);
  if (!v) return;
  v.warnings++;
  saveToStorage();
  renderViolations();
  showToast('warning', 'Warning Issued', `Warning issued to ${v.tenant} for ${v.type}`);
}

function escalateViolation(id) {
  const v = violations.find(v => v.id === id);
  if (!v) return;

  showToast('warning', 'Escalated to Owner', `Violation by ${v.tenant} has been sent to the Property Owner.`);

  const newNotif = {
    id: Date.now(),
    title: 'Violation Escalated',
    message: `${v.tenant} (Room ${v.room}) details sent to owner.`,
    time: 'Just now',
    read: false,
    icon: 'warning'
  };

  notifications.unshift(newNotif);
  saveToStorage();
  updateNotifBadge();

  if (currentSection === 'notifications') {
    renderNotifications();
  }
}

// ----- Filter Setup -----
function setupViolationFilter() {
  const violFilter = document.getElementById('violation-filter');
  if (violFilter) {
    violFilter.addEventListener('change', () => renderViolations(violFilter.value));
  }
}
