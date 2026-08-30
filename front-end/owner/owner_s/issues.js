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
  
  const sessionStr = sessionStorage.getItem('pg_user');
  if (!sessionStr) return;
  const session = JSON.parse(sessionStr);

  try {
    const res = await fetch('http://localhost:3000/complaints', {
      headers: {
        'x-user-id': session.id || 1, // fallback to 1 if no session ID
        'x-role': session.role || 'owner'
      }
    });
    if (res.ok) {
      const dbComplaints = await res.json();
      allIssues = dbComplaints.map(i => ({
        id: i.id,
        title: i.type || 'Issue',
        description: i.description || 'No description provided.',
        category: 'Maintenance',
        priority: i.priority ? (i.priority.charAt(0).toUpperCase() + i.priority.slice(1)) : 'Medium',
        status: i.status === 'open' || i.status === 'pending' ? 'Open' : i.status === 'in_progress' ? 'In Progress' : i.status === 'escalated' ? 'Escalated' : 'Resolved',
        reportedBy: i.tenant ? i.tenant.name : 'Unknown Tenant',
        propertyName: i.property ? i.property.name : 'Sunrise PG Residency',
        room: 'Unknown',
        reportedDate: i.reportedAt || new Date().toISOString().split('T')[0],
        _isGlobal: true,
        _escalatedByWarden: i.status === 'escalated'
      }));
    }
  } catch(err) {
    console.error('Failed to fetch issues:', err);
    allIssues = [];
  }

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

  const sessionStr = sessionStorage.getItem('pg_user');
  const session = sessionStr ? JSON.parse(sessionStr) : {};
  const statusPayload = newStatus === 'Open' ? 'pending' : newStatus === 'In Progress' ? 'in_progress' : newStatus === 'Escalated' ? 'escalated' : 'resolved';

  try {
    const res = await fetch(`http://localhost:3000/complaints/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session.id || 1,
        'x-role': session.role || 'owner'
      },
      body: JSON.stringify({ status: statusPayload })
    });
    if(res.ok) {
       await loadIssues();
    }
  } catch(err) {
    console.error(err);
  }

  showToast(`Issue marked as "${newStatus}"`, 'success');
  loadSidebarBadges();
}

async function deleteIssue(id) {
  const issue = allIssues.find(i => String(i.id) === String(id));
  if (!issue) return;
  confirmDialog('Delete Issue', `Delete "<strong>${issue.title}</strong>"? This cannot be undone.`, async () => {
    
    const sessionStr = sessionStorage.getItem('pg_user');
    const session = sessionStr ? JSON.parse(sessionStr) : {};

    try {
      await fetch(`http://localhost:3000/complaints/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': session.id || 1,
          'x-role': session.role || 'owner'
        }
      });
      await loadIssues();
    } catch(err) {
      console.error(err);
    }

    closeModal();
    showToast('Issue deleted', 'success');
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

  const sessionStr = sessionStorage.getItem('pg_user');
  const session = sessionStr ? JSON.parse(sessionStr) : {};

  try {
    const res = await fetch('http://localhost:3000/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session.id || 1,
        'x-role': session.role || 'owner'
      },
      body: JSON.stringify({
        type: title,
        description: document.getElementById('newIssueDesc').value.trim(),
        priority: document.getElementById('newIssuePriority').value,
        propertyId: propId || 1 // parse it correctly based on actual id
      })
    });
    if (res.ok) {
       await loadIssues();
       closeModal();
       showToast('Issue reported successfully!', 'success');
       loadSidebarBadges();
    } else {
       showToast('Failed to report issue', 'error');
    }
  } catch(err) {
    console.error(err);
  }
}