import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'plumbing':
      return 'water_drop';
    case 'electrical':
      return 'bolt';
    case 'appliances':
      return 'kitchen';
    case 'internet/wifi':
    case 'internet':
    case 'wifi':
      return 'wifi';
    case 'maintenance':
      return 'build';
    default:
      return 'report_problem';
  }
};

const Issues = () => {
  const { tenant, activeBooking } = useAuth();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search & View Mode
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Reporting Form State
  const [isReporting, setIsReporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Plumbing');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/issues/my');
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError('Unable to load issues. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [tenant]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill out all required fields (Title, Description).');
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch('/issues', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
          priority: selectedPriority,
          location: location.trim() || undefined,
          propertyId: activeBooking?.propertyId || activeBooking?.property?.id || 1,
          roomId: activeBooking?.roomId || 1,
        }),
      });

      // Reset form
      setTitle('');
      setLocation('');
      setDescription('');
      setSelectedCategory('Plumbing');
      setSelectedPriority('medium');
      setIsReporting(false);

      await fetchIssues();
    } catch (err) {
      console.error('Error submitting issue:', err);
      alert(err.message || 'Failed to submit issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm('Are you sure you want to cancel or delete this issue?')) {
      return;
    }
    try {
      await apiFetch(`/issues/${issueId}`, { method: 'DELETE' });
      await fetchIssues();
    } catch (err) {
      console.error('Failed to delete issue:', err);
      alert('Failed to delete issue.');
    }
  };

  const totalCount = issues.length;
  const openCount = issues.filter((i) => i.status === 'open').length;
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  const filteredIssues = issues.filter((iss) => {
    if (statusFilter !== 'all' && iss.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = iss.title?.toLowerCase().includes(q);
      const matchDesc = iss.description?.toLowerCase().includes(q);
      const matchCat = iss.category?.toLowerCase().includes(q);
      const matchLoc = iss.location?.toLowerCase().includes(q);
      const matchPri = iss.priority?.toLowerCase().includes(q);
      const matchStat = iss.status?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCat || matchLoc || matchPri || matchStat;
    }
    return true;
  });

  if (isReporting) {
    return (
      <div>
        <div className="page-header page-header-row">
          <div>
            <button
              className="btn btn-ghost btn-sm mb-12"
              onClick={() => setIsReporting(false)}
              style={{ marginBottom: '12px' }}
            >
              ← Back to Issues
            </button>
            <h1>Report New Issue</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card mb-16" style={{ marginBottom: '16px' }}>
            <div className="card-body">
              <div className="card-title">Select Issue Category *</div>
              <div className="category-grid mt-14" style={{ marginTop: '14px' }}>
                {[
                  { name: 'Plumbing', icon: '💧' },
                  {
                    name: 'Electrical',
                    icon: <span className="material-icons-outlined" style={{ fontSize: '24px' }}>bolt</span>,
                  },
                  { name: 'Appliances', icon: '🔌' },
                  {
                    name: 'Internet/WiFi',
                    icon: <span className="material-icons-outlined" style={{ fontSize: '24px' }}>wifi</span>,
                  },
                  { name: 'Maintenance', icon: '🔩' },
                  {
                    name: 'Other',
                    icon: <span className="material-icons-outlined" style={{ fontSize: '24px' }}>smartphone</span>,
                  },
                ].map((cat) => (
                  <div
                    key={cat.name}
                    className={`category-item ${selectedCategory === cat.name ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="cat-icon">{cat.icon}</div>
                    <div className="cat-name">{cat.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card mb-16" style={{ marginBottom: '16px' }}>
            <div className="card-body">
              <div className="card-title">Select Priority *</div>
              <div className="mt-14" style={{ marginTop: '14px' }}>
                <div
                  className={`priority-option ${selectedPriority === 'low' ? 'selected low' : ''}`}
                  onClick={() => setSelectedPriority('low')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="p-name">Low Priority</div>
                  </div>
                  <div className="priority-radio"></div>
                </div>
                <div
                  className={`priority-option ${selectedPriority === 'medium' ? 'selected medium' : ''}`}
                  onClick={() => setSelectedPriority('medium')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div
                      className="p-name"
                      style={selectedPriority === 'medium' ? { color: 'var(--warning)' } : {}}
                    >
                      Medium Priority
                    </div>
                  </div>
                  <div className="priority-radio"></div>
                </div>
                <div
                  className={`priority-option ${selectedPriority === 'high' ? 'selected high' : ''}`}
                  onClick={() => setSelectedPriority('high')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="p-name">High Priority</div>
                  </div>
                  <div className="priority-radio"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-16" style={{ marginBottom: '16px' }}>
            <div className="card-body">
              <div className="card-title">Issue Details</div>
              <div className="mt-14" style={{ marginTop: '14px' }}>
                <div className="form-group">
                  <label>Issue Title *</label>
                  <input
                    type="text"
                    placeholder="Brief title of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="Room number or specific area"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Detailed Description *</label>
                  <textarea
                    placeholder="Describe the issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setIsReporting(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={submitting}
            >
              <span className="btn-text">
                {submitting ? 'Submitting...' : 'Submit Issue'}
              </span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Issues</h1>
          <p>Track, report and resolve maintenance issues</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsReporting(true)}>
          + Report New Issue
        </button>
      </div>

      <div className="stats-grid mb-20" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">
            Total Issues <span className="stat-icon">ℹ️</span>
          </div>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Open{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                error
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {openCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            In Progress{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                schedule
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {inProgressCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Resolved{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                check_circle
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* MODERN CARD PANEL */}
      <div className="premium-card-panel">
        <div className="panel-header-bar">
          <div className="panel-header-title">
            <h2>All Issues</h2>
            <span className="panel-count-badge">{filteredIssues.length}</span>
          </div>

          <div className="panel-controls-right">
            {/* Status Filter Pills */}
            <div className="panel-filters-wrap">
              <button
                className={`filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({issues.length})
              </button>
              <button
                className={`filter-pill-btn ${statusFilter === 'open' ? 'active' : ''}`}
                onClick={() => setStatusFilter('open')}
              >
                Open ({openCount})
              </button>
              <button
                className={`filter-pill-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
                onClick={() => setStatusFilter('in_progress')}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                className={`filter-pill-btn ${statusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('resolved')}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            {/* Search Input Pill */}
            <div className="search-input-pill">
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search issues, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid Card View"
              >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>grid_view</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table List View"
              >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        {loading ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span
              className="material-icons-outlined"
              style={{ fontSize: '42px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}
            >
              sync
            </span>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Loading issues from Neon...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="records-empty-box">
            <div className="records-empty-icon">
              <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
                build_circle
              </span>
            </div>
            <div className="records-empty-title">
              {issues.length === 0 ? 'No Issues Reported Yet' : 'No Matching Issues Found'}
            </div>
            <div className="records-empty-subtitle">
              {issues.length === 0
                ? 'Your room and facilities are looking good! If anything breaks or needs repair, report an issue here.'
                : 'Try adjusting your filters or search keywords.'}
            </div>
            {issues.length === 0 ? (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px' }}
                onClick={() => setIsReporting(true)}
              >
                + Report New Issue
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* MODERN CARD GRID */
          <div className="item-cards-grid">
            {filteredIssues.map((iss) => (
              <div key={iss.id} className={`modern-record-card status-${iss.status || 'open'}`}>
                <div>
                  <div className="card-top-meta">
                    <div className="card-badges-left">
                      <span className="category-chip">
                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>
                          {getCategoryIcon(iss.category)}
                        </span>
                        {iss.category}
                      </span>
                      <span className={`priority-tag ${iss.priority || 'medium'}`}>
                        <span className="material-icons-outlined" style={{ fontSize: '13px' }}>
                          {iss.priority === 'urgent' || iss.priority === 'high' ? 'priority_high' : 'flag'}
                        </span>
                        {iss.priority}
                      </span>
                    </div>

                    <span className={`status-badge-pill ${iss.status || 'open'}`}>
                      <span className="pulse-dot"></span>
                      {iss.status?.replace('_', ' ') || 'Open'}
                    </span>
                  </div>

                  <h3 className="record-main-title">{iss.title}</h3>

                  {iss.location && (
                    <div className="record-location-tag">
                      <span className="material-icons-outlined" style={{ fontSize: '13px' }}>
                        location_on
                      </span>
                      {iss.location}
                    </div>
                  )}

                  <p className="record-desc-text">
                    {iss.description || 'No description provided.'}
                  </p>
                </div>

                <div className="record-card-footer">
                  <div className="record-date-info">
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                      calendar_today
                    </span>
                    {iss.createdAt
                      ? new Date(iss.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>

                  <button
                    className="record-delete-btn"
                    onClick={() => handleDelete(iss.id)}
                    title="Cancel or delete issue"
                  >
                    <span className="material-icons-outlined" style={{ fontSize: '17px' }}>
                      delete_outline
                    </span>
                  </button>
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
                  <th>Category</th>
                  <th>Title & Description</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((iss) => (
                  <tr key={iss.id}>
                    <td>
                      <span className="category-chip">
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>
                          {getCategoryIcon(iss.category)}
                        </span>
                        {iss.category}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '3px' }}>
                        {iss.title}
                      </strong>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {iss.description}
                      </span>
                    </td>
                    <td>
                      {iss.location ? (
                        <span className="record-location-tag">
                          <span className="material-icons-outlined" style={{ fontSize: '13px' }}>
                            location_on
                          </span>
                          {iss.location}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`priority-tag ${iss.priority || 'medium'}`}>
                        {iss.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-pill ${iss.status || 'open'}`}>
                        <span className="pulse-dot"></span>
                        {iss.status?.replace('_', ' ') || 'Open'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {iss.createdAt
                        ? new Date(iss.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="record-delete-btn"
                        onClick={() => handleDelete(iss.id)}
                        title="Delete issue"
                      >
                        <span className="material-icons-outlined" style={{ fontSize: '17px' }}>
                          delete_outline
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Issues;
