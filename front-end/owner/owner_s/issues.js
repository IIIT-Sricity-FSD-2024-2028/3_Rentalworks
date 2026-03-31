// issues.js
let allIssues = [];
let allProperties = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('issues', 'Issues', 'Track and resolve property issues');
  await loadIssues();
});

async function loadIssues() {
  const data = await fetchData();
  allIssues = data.issues || [];
  allProperties = data.properties || [];
  renderIssuesPage(allIssues);
}

function renderIssuesPage(issues) {
  const open = issues.filter(i => i.status === 'Open').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-icon red">🔴</div>
        <div class="stat-info">
          <div class="stat-value">${open}</div>
          <div class="stat-label">Open Issues</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🟡</div>
        <div class="stat-info">
          <div class="stat-value">${inProgress}</div>
          <div class="stat-label">In Progress</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-info">
          <div class="stat-value">${resolved}</div>
          <div class="stat-label">Resolved</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-search">
        <span>🔍</span>
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
      <div class="empty-icon">✅</div>
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
            👤 Reported by: ${issue.reportedBy || 'Warden'}
          </span>
          <span>•</span>
          <span>🏢 ${issue.propertyName}</span>
          <span>•</span>
          <span>📅 ${formatDate(issue.reportedDate)}</span>
          <span>•</span>
          <span class="badge badge-${issue.priority.toLowerCase()}">${getPriorityIcon(issue.priority)} ${issue.priority}</span>
          <span class="badge badge-${issue.status.toLowerCase().replace(' ', '')}">${issue.status}</span>
        </div>
        <div class="issue-desc">${issue.description}</div>
      </div>
      <div class="issue-actions">
        ${issue.status !== 'Resolved' ? `
          <button class="btn btn-success btn-sm" onclick="updateIssueStatus('${issue.id}', 'Resolved')">✅ Resolve</button>
          ${issue.status === 'Open' ? `<button class="btn btn-warning btn-sm" onclick="updateIssueStatus('${issue.id}', 'In Progress')">⏳ In Progress</button>` : ''}
        ` : `<span class="badge badge-resolved">✅ Resolved</span>`}
        
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
  const data = getData();
  if (!data) return;
  const idx = data.issues.findIndex(i => i.id === id);
  if (idx === -1) return;
  data.issues[idx].status = newStatus;
  updateData(data);
  allIssues = data.issues;

  const card = document.getElementById(`issue-card-${id}`);
  if (card) { card.style.opacity = '0.5'; card.style.transform = 'scale(0.98)'; card.style.transition = '0.2s'; }
  await new Promise(r => setTimeout(r, 200));

  showToast(`Issue marked as "${newStatus}"`, 'success');
  renderIssuesPage(allIssues);
  filterIssues();
  loadSidebarBadges();
}

function deleteIssue(id) {
  const issue = allIssues.find(i => i.id === id);
  if (!issue) return;
  confirmDialog('Delete Issue', `Delete "<strong>${issue.title}</strong>"? This cannot be undone.`, () => {
    const data = getData();
    data.issues = data.issues.filter(i => i.id !== id);
    updateData(data);
    allIssues = data.issues;
    closeModal();
    showToast('Issue deleted', 'success');
    filterIssues();
    loadSidebarBadges();
  });
}

function openAddIssueModal() {
  const propertyOptions = allProperties.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <span class="modal-title">⚠️ Report New Issue</span>
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
      <button class="btn btn-primary" onclick="submitNewIssue()">➕ Add Issue</button>
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