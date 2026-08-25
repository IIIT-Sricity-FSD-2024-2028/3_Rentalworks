// issues.js
let allIssues = [];
let allProperties = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('issues', 'Issues', 'Track and resolve property issues');
  await loadIssues();

  // Live sync: when tenant submits a new issue, refresh the list
  window.addEventListener('storage', (e) => {
    if (e.key === 'global_issues' || e.key === 'cross_notifications') {
      loadIssues();
    }
  });
});

async function loadIssues() {
  const data = await fetchData();
  allProperties = data.properties || [];
  
  // Only keep 2 meaningful static issues (clean data)
  const staticIssues = [
    {
      id: 'issue_001',
      propertyId: 'prop_001',
      propertyName: 'Sunrise PG',
      title: 'Water leakage in Room 3',
      description: 'There is a water leakage from the roof in Room 3 which is causing inconvenience to tenants.',
      category: 'Maintenance',
      priority: 'High',
      status: 'Open',
      reportedBy: 'Rahul Sharma',
      reportedDate: '2025-03-20'
    },
    {
      id: 'issue_002',
      propertyId: 'prop_001',
      propertyName: 'Sunrise PG',
      title: 'WiFi not working in Block B',
      description: 'The WiFi router in Block B stopped working since yesterday morning.',
      category: 'Internet',
      priority: 'Medium',
      status: 'Open',
      reportedBy: 'Priya Nair',
      reportedDate: '2025-03-22'
    }
  ];

  // Merge tenant-submitted issues from global_issues
  let globalIss = JSON.parse(localStorage.getItem('global_issues')) || [];
  let tenantIssues = globalIss.map(i => ({
    id: i.id,
    title: i.title,
    description: i.desc || i.description || 'No description provided.',
    category: i.category || 'Maintenance',
    priority: i.priority ? (i.priority.charAt(0).toUpperCase() + i.priority.slice(1)) : 'Medium',
    status: i.status === 'open' ? 'Open' : i.status === 'in-progress' ? 'In Progress' : 'Resolved',
    reportedBy: i.tenantName || 'Amit Sharma (Tenant)',
    propertyName: i.propertyName || 'Sunrise PG Residency',
    room: i.room || 'A-204',
    reportedDate: i.reportedDate || new Date().toISOString().split('T')[0],
    _isGlobal: true,
    _escalatedByWarden: i._escalatedByWarden || false
  }));
  
  // Merge: tenant issues first (most recent), then static
  allIssues = [...tenantIssues, ...staticIssues];
  renderIssuesPage(allIssues);
}

function renderIssuesPage(issues) {
  const open = issues.filter(i => i.status === 'Open').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-icon red"><span class="material-icons" style="font-size:22px;color:#ef4444">error</span></div>
        <div class="stat-info">
          <div class="stat-value">${open}</div>
          <div class="stat-label">Open Issues</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><span class="material-icons" style="font-size:22px;color:#eab308">pending</span></div>
        <div class="stat-info">
          <div class="stat-value">${inProgress}</div>
          <div class="stat-label">In Progress</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><span class="material-icons" style="font-size:22px;color:#22c55e">check_circle</span></div>
        <div class="stat-info">
          <div class="stat-value">${resolved}</div>
          <div class="stat-label">Resolved</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-search">
        <span class="material-icons" style="font-size:20px;color:#94a3b8">search</span>
        <input type="text" id="issueSearch" placeholder="Search issues..." oninput="filterIssues()">
      </div>
      <select class="filter-select" id="filterIssueStatus" onchange="filterIssues()">
        <option value="">All Status</option>
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>
      <select class="filter-select" id="filterIssuePriority" onchange="filterIssues()">
        <option value="">All Priority</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
      <select class="filter-select" id="filterIssueCategory" onchange="filterIssues()">
        <option value="">All Categories</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Internet">Internet</option>
        <option value="Appliance">Appliance</option>
        <option value="Housekeeping">Housekeeping</option>
        <option value="Security">Security</option>
        <option value="Electrical">Electrical</option>
      </select>
      </div>

    <div id="issuesList">
      ${renderIssuesList(issues)}
    </div>
  `;
}

function renderIssuesList(issues) {
  if (issues.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon"><span class="material-icons" style="font-size:48px;color:#22c55e">check_circle</span></div>
      <h3>No Issues Found</h3>
      <p>Try adjusting your filters, or all issues are resolved!</p>
    </div>`;
  }
  
  return issues.map(issue => `
    <div class="issue-card" id="issue-card-${issue.id}">
      <div class="issue-icon" style="background:${issue.priority === 'High' ? 'var(--danger-bg)' : issue.priority === 'Medium' ? 'var(--warning-bg)' : 'var(--info-bg)'}">
        ${getCategoryIcon(issue.category)}
      </div>
      <div class="issue-body">
        <div class="issue-title">${issue.title}</div>
        <div class="issue-meta">
          <span class="badge" style="background:var(--primary-light); color:var(--primary); border:1px solid #ddd8ff">
            <span class="material-icons" style="font-size:14px;vertical-align:middle">person</span> Reported by: ${issue.reportedBy || 'Warden'}
          </span>
          <span>•</span>
          <span><span class="material-icons" style="font-size:14px;vertical-align:middle">apartment</span> ${issue.propertyName || 'Sunrise PG'}${issue.room ? ' — Room ' + issue.room : ''}</span>
          <span>•</span>
          <span><span class="material-icons" style="font-size:14px;vertical-align:middle">calendar_today</span> ${formatDate(issue.reportedDate)}</span>
          <span>•</span>
          <span class="badge badge-${(issue.priority || 'medium').toLowerCase()}">${getPriorityIcon(issue.priority)} ${issue.priority}</span>
          <span class="badge badge-${(issue.status || 'open').toLowerCase().replace(' ', '')}">${issue.status}</span>
          ${issue._escalatedByWarden ? '<span class="badge" style="background:#fce7f3;color:#9d174d;font-size:10px"><span class="material-icons" style="font-size:12px;vertical-align:middle">warning</span> Escalated by Warden</span>' : (issue._isGlobal ? '<span class="badge" style="background:#fef9c3;color:#92400e;font-size:10px"><span class="material-icons" style="font-size:12px;vertical-align:middle">mail</span> Reported by Tenant</span>' : '')}
        </div>
        <div class="issue-desc">${issue.description || 'No description provided.'}</div>
      </div>
      <div class="issue-actions">
        ${issue.status !== 'Resolved' ? `
          <button class="btn btn-success btn-sm" onclick="updateIssueStatus('${issue.id}', 'Resolved')"><span class="material-icons" style="font-size:16px;vertical-align:middle">check</span> Resolve</button>
          ${issue.status === 'Open' ? `<button class="btn btn-warning btn-sm" onclick="updateIssueStatus('${issue.id}', 'In Progress')"><span class="material-icons" style="font-size:16px;vertical-align:middle">schedule</span> In Progress</button>` : ''}
        ` : `<span class="badge badge-resolved"><span class="material-icons" style="font-size:14px;vertical-align:middle">check_circle</span> Resolved</span>`}
        <button class="btn btn-danger btn-sm" onclick="deleteIssue('${issue.id}')"><span class="material-icons" style="font-size:16px;vertical-align:middle">delete</span> Delete</button>
        </div>
    </div>
  `).join('');
}

function filterIssues() {
  const search = document.getElementById('issueSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('filterIssueStatus')?.value || '';
  const priority = document.getElementById('filterIssuePriority')?.value || '';
  const category = document.getElementById('filterIssueCategory')?.value || '';

  const filtered = allIssues.filter(i => {
    const matchSearch = !search || i.title.toLowerCase().includes(search) || i.propertyName.toLowerCase().includes(search) || i.reportedBy.toLowerCase().includes(search);
    const matchStatus = !status || i.status === status;
    const matchPriority = !priority || i.priority === priority;
    const matchCategory = !category || i.category === category;
    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  const list = document.getElementById('issuesList');
  if (list) list.innerHTML = renderIssuesList(filtered);
}

async function updateIssueStatus(id, newStatus) {
  const issueRef = allIssues.find(i => String(i.id) === String(id));
  if (!issueRef) return;
  
  if (issueRef._isGlobal) {
    // Update in global_issues (Tenant's data store)
    let globalIss = JSON.parse(localStorage.getItem('global_issues')) || [];
    let match = globalIss.find(i => String(i.id) === String(id));
    if (match) {
      match.status = newStatus === 'Open' ? 'open' : newStatus === 'In Progress' ? 'in-progress' : 'resolved';
      localStorage.setItem('global_issues', JSON.stringify(globalIss));
    }
    issueRef.status = newStatus;
  } else {
    // Update in owner's own data.json storage
    const data = getData();
    if (data) {
      const idx = data.issues.findIndex(i => String(i.id) === String(id));
      if (idx !== -1) {
        data.issues[idx].status = newStatus;
        updateData(data);
      }
    }
    issueRef.status = newStatus;
  }

  // Fire cross_notification to Tenant when resolved
  if (newStatus === 'Resolved') {
    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'Issue Resolved by Owner',
      message: `Your issue "${issueRef.title}" at ${issueRef.propertyName || 'Sunrise PG'} has been resolved by the Property Owner.`,
      type: 'success',
      priority: 'important',
      targetRole: 'tenant',
      by: 'Owner',
      sentAt: new Date().toLocaleString()
    });
    // Also notify Warden
    crossNotifs.push({
      id: Date.now() + 1,
      title: 'Issue Resolved by Owner',
      message: `Issue "${issueRef.title}" has been marked resolved by the Property Owner.`,
      type: 'success',
      priority: 'important',
      targetRole: 'warden',
      by: 'Owner',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
  }

  const card = document.getElementById(`issue-card-${id}`);
  if (card) { card.style.opacity = '0.5'; card.style.transform = 'scale(0.98)'; card.style.transition = '0.2s'; }
  await new Promise(r => setTimeout(r, 200));

  showToast(`Issue marked as "${newStatus}"`, 'success');
  renderIssuesPage(allIssues);
  loadSidebarBadges();
}

function deleteIssue(id) {
  const issue = allIssues.find(i => String(i.id) === String(id));
  if (!issue) return;
  confirmDialog('Delete Issue', `Delete "<strong>${issue.title}</strong>"? This cannot be undone.`, () => {
    if (issue._isGlobal) {
      // Remove from global_issues (Tenant's store)
      let globalIss = JSON.parse(localStorage.getItem('global_issues')) || [];
      globalIss = globalIss.filter(i => String(i.id) !== String(id));
      localStorage.setItem('global_issues', JSON.stringify(globalIss));
    } else {
      // Remove from owner's own data store
      const data = getData();
      if (data) {
        data.issues = data.issues.filter(i => String(i.id) !== String(id));
        updateData(data);
      }
    }
    allIssues = allIssues.filter(i => String(i.id) !== String(id));
    closeModal();
    showToast('Issue deleted', 'success');
    renderIssuesPage(allIssues);
    loadSidebarBadges();
  });
}

function openAddIssueModal() {
  const propertyOptions = allProperties.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle">warning</span> Report New Issue</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;max-height:65vh;overflow-y:auto;padding-right:4px">
      <div class="form-group">
        <label class="form-label">Property <span class="req">*</span></label>
        <select class="form-input" id="newIssueProp">${propertyOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Issue Title <span class="req">*</span></label>
        <input class="form-input" id="newIssueTitle" placeholder="Brief description of the issue">
        <span class="form-error">Title is required</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-input" id="newIssueCat">
            <option>Maintenance</option><option>Internet</option><option>Appliance</option>
            <option>Housekeeping</option><option>Security</option><option>Electrical</option><option>Plumbing</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-input" id="newIssuePriority">
            <option>Low</option><option selected>Medium</option><option>High</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Reported By</label>
        <input class="form-input" id="newIssueBy" placeholder="Tenant name">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="newIssueDesc" placeholder="Detailed description of the issue..." rows="3"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitNewIssue()"><span class="material-icons" style="font-size:16px;vertical-align:middle">add</span> Add Issue</button>
    </div>
  `);
}

async function submitNewIssue() {
  const title = document.getElementById('newIssueTitle').value.trim();
  if (!title) { showToast('Issue title is required', 'error'); return; }

  const propSelect = document.getElementById('newIssueProp');
  const propId = propSelect.value;
  const propName = propSelect.options[propSelect.selectedIndex]?.dataset.name || '';

  const data = getData();
  const newIssue = {
    id: generateId('issue'),
    propertyId: propId,
    propertyName: propName,
    title,
    description: document.getElementById('newIssueDesc').value.trim(),
    category: document.getElementById('newIssueCat').value,
    priority: document.getElementById('newIssuePriority').value,
    status: 'Open',
    reportedBy: document.getElementById('newIssueBy').value.trim() || 'Owner',
    reportedDate: new Date().toISOString().split('T')[0]
  };

  data.issues.unshift(newIssue);
  updateData(data);
  allIssues = data.issues;
  closeModal();
  showToast('Issue reported successfully!', 'success');
  filterIssues();
  loadSidebarBadges();
}