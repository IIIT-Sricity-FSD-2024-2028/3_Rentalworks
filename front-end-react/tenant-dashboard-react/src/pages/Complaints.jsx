import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { StatCard, StatusBadge, FilterBar, EmptyState } from '../components';

const parseComplaint = (c) => {
  const raw = c.description || '';
  let text = raw;
  let priority = 'medium';

  // Extract [Priority: ...] if present
  const match = text.match(/^\[Priority:\s*([a-zA-Z]+)\]\s*/i);
  if (match) {
    priority = match[1].toLowerCase();
    text = text.replace(match[0], '').trim();
  }

  let title = '';
  let desc = text;
  const dashIndex = text.indexOf(' - ');
  if (dashIndex !== -1) {
    title = text.substring(0, dashIndex).trim();
    desc = text.substring(dashIndex + 3).trim();
  } else if (text.length > 55) {
    title = text.substring(0, 50) + '...';
  } else {
    title = text || 'General Maintenance';
  }

  // Infer category & icon
  const combined = (title + ' ' + desc).toLowerCase();
  let category = 'General';
  let categoryIcon = 'report_problem';

  if (/water|tap|pipe|leak|plumb|sink|flush|drain|toilet|shower/.test(combined)) {
    category = 'Plumbing';
    categoryIcon = 'water_drop';
  } else if (/light|power|electric|switch|fan|ac|air|cooler|fuse|plug|voltage/.test(combined)) {
    category = 'Electrical';
    categoryIcon = 'bolt';
  } else if (/wifi|internet|network|router|speed|lan|connect/.test(combined)) {
    category = 'Internet / WiFi';
    categoryIcon = 'wifi';
  } else if (/clean|garbage|trash|dust|pest|roach|smell|odor|dirty/.test(combined)) {
    category = 'Sanitation';
    categoryIcon = 'cleaning_services';
  } else if (/noise|loud|music|party|shout|bark|barking|sound/.test(combined)) {
    category = 'Disturbance';
    categoryIcon = 'volume_up';
  } else if (/door|lock|key|handle|window|latch|security|safe/.test(combined)) {
    category = 'Security';
    categoryIcon = 'lock';
  }

  return {
    ...c,
    parsedTitle: title || 'General Complaint',
    parsedDesc: desc,
    parsedPriority: priority,
    parsedCategory: category,
    categoryIcon,
  };
};

const Complaints = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { tenant, activeBooking } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const data = await apiFetch('/complaints');
      const userComplaints = (Array.isArray(data) ? data : []).filter((c) => c.tenantId === tenant.id);
      setComplaints(userComplaints);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [tenant]);

  const handleSubmit = async () => {
    if (!title || !description) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmitting(true);

      const fullDescription = `[Priority: ${priority}] ${title} - ${description}`;

      await apiFetch('/complaints', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: tenant.id,
          propertyId: activeBooking?.propertyId || 1, // Fallback if no active booking
          description: fullDescription,
        }),
      });

      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      fetchComplaints(); // Refresh list
    } catch (error) {
      alert('Failed to submit complaint.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = complaints.filter((c) => c.status === 'open').length;
  const progressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  const parsedComplaints = complaints.map(parseComplaint);

  const filteredComplaints = parsedComplaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.parsedTitle?.toLowerCase().includes(q);
      const matchDesc = c.parsedDesc?.toLowerCase().includes(q);
      const matchCategory = c.parsedCategory?.toLowerCase().includes(q);
      const matchStatus = c.status?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory || matchStatus;
    }
    return true;
  });

  const filterOptions = [
    { key: 'all', label: 'All', count: complaints.length },
    { key: 'open', label: 'Open', count: openCount },
    { key: 'in_progress', label: 'In Progress', count: progressCount },
    { key: 'resolved', label: 'Resolved', count: resolvedCount },
  ];

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Complaints</h1>
          <p>Manage and track all your filed complaints</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + File New Complaint
        </button>
      </div>

      <div className="stats-grid mb-20" style={{ marginBottom: '20px' }}>
        <StatCard label="Total Complaints" value={complaints.length} />
        <StatCard
          label="Open"
          value={openCount}
          valueColor="var(--danger)"
          icon={<span className="material-icons-outlined" style={{ fontSize: '32px' }}>error</span>}
        />
        <StatCard
          label="In Progress"
          value={progressCount}
          valueColor="var(--warning)"
          icon={<span className="material-icons-outlined" style={{ fontSize: '32px' }}>schedule</span>}
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          valueColor="var(--success)"
          icon={<span className="material-icons-outlined" style={{ fontSize: '32px' }}>check_circle</span>}
        />
      </div>

      {/* MODERN CARD PANEL WITH REUSABLE FILTER BAR */}
      <div className="premium-card-panel">
        <FilterBar
          title="All Complaints"
          count={filteredComplaints.length}
          filters={filterOptions}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search complaints..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* CONTENT AREA */}
        {loading ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span
              className="material-icons-outlined"
              style={{ fontSize: '42px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}
            >
              sync
            </span>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <EmptyState
            icon="checklist"
            title={complaints.length === 0 ? 'No Complaints Filed Yet' : 'No Matching Complaints Found'}
            subtitle={
              complaints.length === 0
                ? 'Everything seems to be running smoothly! If you ever face an issue, file a complaint anytime.'
                : 'Try adjusting your filters or search terms to find what you are looking for.'
            }
            actionLabel={complaints.length === 0 ? '+ File New Complaint' : 'Reset Filters'}
            onAction={
              complaints.length === 0
                ? () => setIsModalOpen(true)
                : () => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }
            }
            actionType={complaints.length === 0 ? 'primary' : 'ghost'}
          />
        ) : viewMode === 'grid' ? (
          /* MODERN CARD GRID */
          <div className="item-cards-grid">
            {filteredComplaints.map((c) => (
              <div key={c.id} className={`modern-record-card status-${c.status || 'open'}`}>
                <div>
                  <div className="card-top-meta">
                    <div className="card-badges-left">
                      <span className="category-chip">
                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>
                          {c.categoryIcon}
                        </span>
                        {c.parsedCategory}
                      </span>
                      <span className={`priority-tag ${c.parsedPriority}`}>
                        <span className="material-icons-outlined" style={{ fontSize: '13px' }}>
                          {c.parsedPriority === 'high' || c.parsedPriority === 'urgent' ? 'priority_high' : 'flag'}
                        </span>
                        {c.parsedPriority}
                      </span>
                    </div>

                    <StatusBadge status={c.status || 'open'} />
                  </div>

                  <h3 className="record-main-title">{c.parsedTitle}</h3>
                  <p className="record-desc-text">
                    {c.parsedDesc || 'No additional details provided.'}
                  </p>
                </div>

                <div className="record-card-footer">
                  <div className="record-date-info">
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                      calendar_today
                    </span>
                    {c.reportedAt
                      ? new Date(c.reportedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>
                    #CMP-{c.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MODERN DATA TABLE VIEW */
          <div style={{ overflowX: 'auto' }}>
            <table className="modern-data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Title & Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#CMP-{c.id}</td>
                    <td>
                      <span className="category-chip">
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>
                          {c.categoryIcon}
                        </span>
                        {c.parsedCategory}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '3px' }}>
                        {c.parsedTitle}
                      </strong>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {c.parsedDesc}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-tag ${c.parsedPriority}`}>
                        {c.parsedPriority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={c.status || 'open'} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {c.reportedAt
                        ? new Date(c.reportedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW COMPLAINT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">
                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                  chat
                </span>
              </div>
              <div>
                <div className="modal-title">File New Complaint</div>
                <div className="modal-sub">Report an issue to management</div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                  close
                </span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  Complaint Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief title of your complaint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  Description <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  placeholder="Describe your complaint in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
