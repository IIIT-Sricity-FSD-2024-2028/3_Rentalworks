/*
========================================================
REACT ASSIGNMENT - TENANT COMPLAINTS
========================================================

SELECTED FEATURE:
Tenant Complaints page

COMPONENT STRUCTURE:
ComplaintsPage (Parent)
├── FilterCards (Child)
├── ComplaintList (Child)
│   └── ComplaintCard (Child)
└── NewComplaintModal (Child)

PROPS:
Props are used to pass complaint data, filter information,
and callback functions from the parent to child components.

CALLBACK:
FilterCards sends the selected filter back to ComplaintsPage
using the onFilterChange callback.
NewComplaintModal sends a new complaint back to
ComplaintsPage using the onAddComplaint callback.

LIFTED STATE:
The complaints array and activeFilter state are stored in
ComplaintsPage because they are shared by multiple child
components. This is lifting state up to the common parent.

JSX:
The original Tenant Complaints HTML UI has been converted
into React JSX and divided into reusable functional components.

TESTING:
The implementation should be tested by checking:
1. Complaint list rendering.
2. All/Open/In Progress/Resolved filters.
3. Filter card counts.
4. Opening and closing the New Complaint modal.
5. Adding a new complaint.
6. Child-to-parent callbacks.
========================================================
*/

import React, { useState } from 'react';

// Child Component: FilterCards
const FilterCards = ({ complaints, activeFilter, onFilterChange }) => {
  const allCount = complaints.length;
  const openCount = complaints.filter(c => c.status === 'open').length;
  const inProgressCount = complaints.filter(c => c.status === 'in-progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  return (
    <div className="grid-4 mb-20">
      {/* CALLBACK: Child calls onFilterChange to communicate with parent. */}
      <div
        className={`stat-card ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onFilterChange('all')}
      >
        <div className="stat-label">All Complaints</div>
        <div className="stat-value">{allCount}</div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'open' ? 'active' : ''}`}
        onClick={() => onFilterChange('open')}
      >
        <div className="stat-label">
          Open <span className="stat-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>error</span></span>
        </div>
        <div className="stat-value" style={{ color: 'var(--danger)' }}>{openCount}</div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'in-progress' ? 'active' : ''}`}
        onClick={() => onFilterChange('in-progress')}
      >
        <div className="stat-label">
          In Progress <span className="stat-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>schedule</span></span>
        </div>
        <div className="stat-value" style={{ color: 'var(--warning)' }}>{inProgressCount}</div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'resolved' ? 'active' : ''}`}
        onClick={() => onFilterChange('resolved')}
      >
        <div className="stat-label">
          Resolved <span className="stat-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>check_circle</span></span>
        </div>
        <div className="stat-value" style={{ color: 'var(--success)' }}>{resolvedCount}</div>
      </div>
    </div>
  );
};

// Child Component: ComplaintCard
const ComplaintCard = ({ complaint }) => {
  return (
    <div className="complaint-item" style={{
      padding: '15px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      marginBottom: '15px',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{complaint.title}</h3>
        <span style={{
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: complaint.status === 'resolved' ? 'var(--success)' : (complaint.status === 'in-progress' ? 'var(--warning)' : 'var(--danger)'),
          color: '#fff'
        }}>
          {complaint.status.toUpperCase()}
        </span>
      </div>
      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>{complaint.desc}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Priority: <strong style={{ color: complaint.priority === 'high' ? 'var(--danger)' : 'inherit' }}>{complaint.priority}</strong></span>
        <span>Filed: {new Date(complaint.filedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

// Child Component: ComplaintList
const ComplaintList = ({ complaints }) => {
  if (complaints.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No complaints found.</div>;
  }

  return (
    <div id="complaints-list">
      {/* PROPS: Passing an individual complaint to ComplaintCard. */}
      {complaints.map(complaint => (
        <ComplaintCard key={complaint.id} complaint={complaint} />
      ))}
    </div>
  );
};

// Child Component: NewComplaintModal
const NewComplaintModal = ({ isOpen, onClose, onAddComplaint }) => {
  // Local state for the form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('low');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) {
      alert("Please enter title and description");
      return;
    }

    const newComplaint = {
      id: Date.now(),
      title,
      desc,
      status: 'open',
      priority,
      filedAt: new Date().toISOString()
    };

    onAddComplaint(newComplaint);

    // Reset form
    setTitle('');
    setDesc('');
    setPriority('low');
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal" style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '500px', padding: '20px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>File New Complaint</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows="4"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ padding: '8px 16px' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Parent Component
const ComplaintsPage = () => {
  // LIFTED STATE: Shared complaint data is stored in the parent.
  const [complaints, setComplaints] = useState([
    { id: 1, title: 'AC not cooling', desc: 'The AC in room A-204 is blowing warm air.', status: 'open', priority: 'high', filedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, title: 'Leaky Faucet', desc: 'Bathroom sink is leaking continuously.', status: 'in-progress', priority: 'medium', filedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 3, title: 'Wi-Fi slow', desc: 'Internet speed is very slow during the evening.', status: 'resolved', priority: 'low', filedAt: new Date(Date.now() - 432000000).toISOString() }
  ]);

  // LIFTED STATE: activeFilter is shared by FilterCards and ComplaintList
  const [activeFilter, setActiveFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived state for filtering
  const filteredComplaints = complaints
    .filter(c => activeFilter === 'all' || c.status === activeFilter)
    .sort((a, b) => new Date(b.filedAt) - new Date(a.filedAt));

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
  };

  const handleAddComplaint = (newComplaint) => {
    setComplaints(prev => [newComplaint, ...prev]);
    setIsModalOpen(false); // Close modal on success
  };

  const getFilterText = () => {
    const displayMap = { 'all': 'All Complaints', 'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved' };
    return displayMap[activeFilter];
  };

  return (
    <div id="page-complaints" className="page active" style={{ display: 'block' }}>
      <div className="page-content">
        <div className="page-header page-header-row">
          <div>
            <h1>Complaints</h1>
            <p>Manage and track your complaints</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + File New Complaint
          </button>
        </div>

        {/* PROPS: Passing complaints and the filter callback to the child. */}
        <FilterCards
          complaints={complaints}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        <div className="complaint-sort-info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <div>Showing: <strong>{getFilterText()}</strong></div>
          <div>Sort: <strong>Newest first</strong></div>
        </div>

        {/* PROPS: Passing filtered complaints to the list component */}
        <ComplaintList
          complaints={filteredComplaints}
        />
      </div>

      {/* CALLBACK: Child calls onAddComplaint when form is submitted */}
      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddComplaint={handleAddComplaint}
      />
    </div>
  );
};

export default ComplaintsPage;
