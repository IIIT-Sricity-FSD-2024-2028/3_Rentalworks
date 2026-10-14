import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Issues = () => {
  const { tenant, activeBooking } = useAuth();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <p>Track and manage all reported issues</p>
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

      <div className="card">
        <div className="card-body">
          <div className="card-title">All Issues</div>
          <div className="mt-14" style={{ marginTop: '14px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading issues from Neon...</p>
            ) : error ? (
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            ) : issues.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No issues reported yet.</p>
            ) : (
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Title & Description</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((iss) => (
                    <tr key={iss.id}>
                      <td>
                        <strong>{iss.title}</strong>
                        {iss.location && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Location: {iss.location}
                          </div>
                        )}
                        <div style={{ fontSize: '13px', marginTop: '2px' }}>
                          {iss.description}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{iss.category}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            color:
                              iss.priority === 'urgent' || iss.priority === 'high'
                                ? 'var(--danger)'
                                : iss.priority === 'medium'
                                ? 'var(--warning)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {iss.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge-${
                            iss.status === 'resolved'
                              ? 'active'
                              : iss.status === 'in_progress'
                              ? 'warning'
                              : 'danger'
                          }`}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {iss.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {iss.createdAt
                          ? new Date(iss.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(iss.id)}
                          title="Delete issue"
                        >
                          <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Issues;
