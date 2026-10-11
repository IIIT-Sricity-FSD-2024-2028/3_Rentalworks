import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Complaints = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { tenant, activeBooking } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const userComplaints = data.filter(c => c.tenantId === tenant.id);
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
          description: fullDescription
        })
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

  const openCount = complaints.filter(c => c.status === 'open').length;
  const progressCount = complaints.filter(c => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Complaints</h1>
          <p>Manage and track your complaints</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ File New Complaint</button>
      </div>

      <div className="stats-grid mb-20" style={{marginBottom: '20px'}}>
        <div className="stat-card"><div className="stat-label">Total Complaints</div><div className="stat-value">{complaints.length}</div></div>
        <div className="stat-card"><div className="stat-label">Open <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span></div><div className="stat-value" style={{color: 'var(--danger)'}}>{openCount}</div></div>
        <div className="stat-card"><div className="stat-label">In Progress <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span></div><div className="stat-value" style={{color: 'var(--warning)'}}>{progressCount}</div></div>
        <div className="stat-card"><div className="stat-label">Resolved <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>check_circle</span></span></div><div className="stat-value" style={{color: 'var(--success)'}}>{resolvedCount}</div></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-title">All Complaints</div>
          <div className="mt-14" style={{marginTop: '14px', color: 'var(--text-muted)'}}>
            {loading ? (
              <p>Loading complaints...</p>
            ) : complaints.length === 0 ? (
              <p>No complaints filed yet.</p>
            ) : (
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Reported At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td>{c.description}</td>
                      <td>{c.reportedAt ? new Date(c.reportedAt).toLocaleDateString() : 'N/A'}</td>
                      <td><span className={`badge-${c.status === 'resolved' ? 'active' : c.status === 'in_progress' ? 'warning' : 'danger'}`} style={{textTransform: 'capitalize'}}>{c.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>chat</span></div>
              <div>
                <div className="modal-title">File New Complaint</div>
                <div className="modal-sub">Report an issue to management</div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><span className="material-icons-outlined" style={{fontSize: '24px'}}>close</span></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Complaint Title <span style={{color: 'var(--danger)'}}>*</span></label>
                <input type="text" placeholder="Brief title of your complaint" value={title} onChange={(e) => setTitle(e.target.value)} />
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
                <label>Description <span style={{color: 'var(--danger)'}}>*</span></label>
                <textarea placeholder="Describe your complaint in detail..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Complaint'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
