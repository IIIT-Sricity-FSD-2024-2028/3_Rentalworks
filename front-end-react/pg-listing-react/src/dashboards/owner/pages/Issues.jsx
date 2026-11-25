import Icon from '../components/Icon';
import React, { useState } from 'react';

// Issues: Track, filter, resolve, report, and delete complaints
export default function Issues({
  issues = [],
  properties = [],
  onUpdateIssueStatus,
  onDeleteIssue,
  onAddIssue,
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [deletingIssue, setDeletingIssue] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newIssue, setNewIssue] = useState({
    propertyId: '',
    title: '',
    category: 'Maintenance',
    priority: 'Medium',
    reportedBy: 'Owner',
    description: '',
  });
  const [addError, setAddError] = useState('');

  const openCount = issues.filter(
    (i) => (i.status || '').toLowerCase() === 'open'
  ).length;
  const inProgressCount = issues.filter(
    (i) =>
      (i.status || '').toLowerCase() === 'in progress' ||
      (i.status || '').toLowerCase() === 'in-progress'
  ).length;
  const resolvedCount = issues.filter(
    (i) => (i.status || '').toLowerCase() === 'resolved'
  ).length;

  const getCategoryIcon = (category) => {
    const icons = {
      Maintenance: 'build',
      Internet: 'wifi',
      Appliance: 'computer',
      Housekeeping: 'cleaning_services',
      Security: 'lock',
      Electrical: 'flash_on',
      Plumbing: 'shower',
    };
    return icons[category] || 'push_pin';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredIssues = issues.filter((i) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q)) ||
      (i.propertyName && i.propertyName.toLowerCase().includes(q)) ||
      (i.reportedBy && i.reportedBy.toLowerCase().includes(q));

    const iStatus = (i.status || '').toLowerCase();
    const fStatus = filterStatus.toLowerCase();
    const matchStatus =
      !filterStatus ||
      iStatus === fStatus ||
      (fStatus === 'in progress' && iStatus === 'in-progress') ||
      (fStatus === 'in-progress' && iStatus === 'in progress');

    const iPriority = (i.priority || '').toLowerCase();
    const fPriority = filterPriority.toLowerCase();
    const matchPriority = !filterPriority || iPriority === fPriority;

    const matchCategory =
      !filterCategory ||
      (i.category || '').toLowerCase() === filterCategory.toLowerCase();

    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newIssue.title.trim()) {
      setAddError('Issue title is required.');
      return;
    }

    const targetPropId = newIssue.propertyId || (properties.length > 0 ? properties[0].id : '');
    const selectedProp = properties.find(p => String(p.id) === String(targetPropId));
    if (!selectedProp) { setAddError('Select a property.'); return; }
    if (!newIssue.description.trim()) { setAddError('Enter an issue description.'); return; }
    const propName = selectedProp.name;
    const propId = selectedProp.id;
    const issueToSubmit = {
      id: 'issue_' + Date.now(),
      propertyId: propId,
      propertyName: propName,
      title: newIssue.title.trim(),
      category: newIssue.category,
      priority: newIssue.priority,
      status: 'Open',
      reportedBy: newIssue.reportedBy.trim() || 'Owner',
      reportedDate: new Date().toISOString().split('T')[0],
      description: newIssue.description.trim() || 'No description provided.',
    };

    if (await onAddIssue(issueToSubmit) === false) return;
    setIsAddModalOpen(false);
    setNewIssue({
      propertyId: '',
      title: '',
      category: 'Maintenance',
      priority: 'Medium',
      reportedBy: 'Owner',
      description: '',
    });
    setAddError('');
  };

  return (
    <div>
      {/* 3 Summary Stats Cards */}
      <div className="grid-3-stats">
        <div className="stat-card">
          <div className="stat-icon red">
            <Icon className="material-icons icon-22 icon-danger">error</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{openCount}</div>
            <div className="stat-label">Open Issues</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Icon className="material-icons icon-22 icon-warning">pending</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Icon className="material-icons icon-22 icon-success">check_circle</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Icon className="material-icons icon-20 icon-muted">search</Icon>
          <input
            type="text"
            id="issueSearch"
            placeholder="Search issues"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          id="filterIssueStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          className="filter-select"
          id="filterIssuePriority"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          className="filter-select"
          id="filterIssueCategory"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Internet">Internet</option>
          <option value="Appliance">Appliance</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Security">Security</option>
          <option value="Electrical">Electrical</option>
        </select>

        <div className="ml-auto">
          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Icon className="material-icons icon-18 icon-middle">add</Icon>{' '}
            Report Issue
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div id="issuesList">
        {filteredIssues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon className="material-icons icon-48 icon-success">check_circle</Icon>
            </div>
            <h3>No Issues Found</h3>
            <p>Try adjusting your filters, or all issues are resolved!</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div key={issue.id} className="issue-card" id={`issue-card-${issue.id}`}>
              <div className={`issue-icon ${issue.priority ? issue.priority.toLowerCase() : 'medium'}`}>
                <Icon className="material-icons icon-18">
                  {getCategoryIcon(issue.category)}
                </Icon>
              </div>

              <div className="issue-body">
                <div className="issue-title">{issue.title}</div>
                <div className="issue-meta">
                  <span className="badge badge-owner-tag">
                    <Icon className="material-icons icon-14 icon-middle">person</Icon>{' '}
                    Reported by: {issue.reportedBy || 'Warden'}
                  </span>
                  <span>•</span>
                  <span>
                    <Icon className="material-icons icon-14 icon-middle">apartment</Icon>{' '}
                    {issue.propertyName || 'Sunrise PG'}
                  </span>
                  <span>•</span>
                  <span>
                    <Icon className="material-icons icon-14 icon-middle">calendar_today</Icon>{' '}
                    {formatDate(issue.reportedDate)}
                  </span>
                  <span>•</span>
                  <span className={`badge badge-${(issue.priority || 'medium').toLowerCase()}`}>
                    {issue.priority}
                  </span>
                  <span className={`badge badge-${(issue.status || 'open').toLowerCase().replace(' ', '')}`}>
                    {issue.status}
                  </span>

                  {issue._escalatedByWarden && (
                    <span className="badge badge-escalated">
                      <Icon className="material-icons icon-12 icon-middle">warning</Icon>{' '}
                      Escalated by Warden
                    </span>
                  )}
                  {issue._isGlobal && !issue._escalatedByWarden && (
                    <span className="badge badge-tenant">
                      <Icon className="material-icons icon-12 icon-middle">mail</Icon>{' '}
                      Reported by Tenant
                    </span>
                  )}
                </div>

                <div className="issue-desc">
                  {issue.description || 'No description provided.'}
                </div>
              </div>

              <div className="issue-actions">
                {issue.status === 'Resolved' ? (
                  <>
                    <button
                      className="btn btn-success btn-sm btn-status-resolved"
                      title="Click to reopen this issue as Open"
                      onClick={() => onUpdateIssueStatus(issue.id, 'Open')}
                    >
                      <Icon className="material-icons icon-14 icon-middle">check_circle</Icon>{' '}
                      Resolved
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Reopen issue"
                      onClick={() => onUpdateIssueStatus(issue.id, 'Open')}
                    >
                      <Icon className="material-icons icon-14 icon-middle">restart_alt</Icon>{' '}
                      Reopen
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => onUpdateIssueStatus(issue.id, 'Resolved')}
                    >
                      <Icon className="material-icons icon-16 icon-middle">check</Icon>{' '}
                      Resolve
                    </button>
                    {issue.status === 'Open' ? (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => onUpdateIssueStatus(issue.id, 'In Progress')}
                      >
                        <Icon className="material-icons icon-16 icon-middle">schedule</Icon>{' '}
                        In Progress
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onUpdateIssueStatus(issue.id, 'Open')}
                      >
                        <Icon className="material-icons icon-16 icon-middle">restart_alt</Icon>{' '}
                        Back to Open
                      </button>
                    )}
                  </>
                )}

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeletingIssue(issue)}
                >
                  <Icon className="material-icons icon-16 icon-middle">delete</Icon>{' '}
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Report New Issue */}
      {isAddModalOpen && (
        <div
          className="modal-overlay show active"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setIsAddModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                <Icon className="material-icons icon-22 icon-middle icon-mr-6">
                  warning
                </Icon>{' '}
                Report New Issue
              </span>
              <button
                className="modal-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                ×
              </button>
            </div>

            {addError && (
              <div className="alert-danger-sm">{addError}</div>
            )}

            <form onSubmit={handleCreateIssue}>
              <div className="modal-form-scroll">
                <div className="form-group">
                  <label className="form-label">
                    Property <span className="req">*</span>
                  </label>
                  <select
                    className="form-input"
                    value={newIssue.propertyId || (properties[0]?.id || '')}
                    onChange={(e) => {
                      const update = { propertyId: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Issue Title <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Brief description of the issue"
                    value={newIssue.title}
                    onChange={(e) => {
                      const update = { title: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={newIssue.category}
                      onChange={(e) => {
                        const update = { category: e.target.value };
                        setNewIssue((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Internet">Internet</option>
                      <option value="Appliance">Appliance</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Security">Security</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-input"
                      value={newIssue.priority}
                      onChange={(e) => {
                        const update = { priority: e.target.value };
                        setNewIssue((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reported By</label>
                  <input
                    className="form-input"
                    placeholder="Tenant or staff name"
                    value={newIssue.reportedBy}
                    onChange={(e) => {
                      const update = { reportedBy: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Detailed description of the issue"
                    value={newIssue.description}
                    onChange={(e) => {
                      const update = { description: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Icon className="material-icons icon-16 icon-middle">add</Icon>{' '}
                  Add Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Issue Confirmation */}
      {deletingIssue && (
        <div
          className="modal-overlay show active"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setDeletingIssue(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Delete Issue</span>
              <button
                className="modal-close"
                onClick={() => setDeletingIssue(null)}
              >
                ×
              </button>
            </div>
            <p className="modal-desc-text">
              Are you sure you want to delete "<strong>{deletingIssue.title}</strong>"? This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeletingIssue(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (await onDeleteIssue(deletingIssue.id) === false) return;
                  setDeletingIssue(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
