import React, { useState } from 'react';

const Issues = () => {
  const [isReporting, setIsReporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');

  if (isReporting) {
    return (
      <div>
        <div className="page-header page-header-row">
          <div>
            <button className="btn btn-ghost btn-sm mb-12" onClick={() => setIsReporting(false)} style={{marginBottom: '12px'}}>← Back to Issues</button>
            <h1>Report New Issue</h1>
          </div>
        </div>
        
        <div className="card mb-16" style={{marginBottom: '16px'}}>
          <div className="card-body">
            <div className="card-title">Select Issue Category *</div>
            <div className="category-grid mt-14" style={{marginTop: '14px'}}>
              {[
                { name: 'Plumbing', icon: '💧' },
                { name: 'Electrical', icon: <span className="material-icons-outlined" style={{fontSize: '24px'}}>bolt</span> },
                { name: 'Appliances', icon: '🔌' },
                { name: 'Internet/WiFi', icon: <span className="material-icons-outlined" style={{fontSize: '24px'}}>wifi</span> },
                { name: 'Maintenance', icon: '🔩' },
                { name: 'Other', icon: <span className="material-icons-outlined" style={{fontSize: '24px'}}>smartphone</span> }
              ].map(cat => (
                <div 
                  key={cat.name} 
                  className={`category-item ${selectedCategory === cat.name ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <div className="cat-icon">{cat.icon}</div>
                  <div className="cat-name">{cat.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="card mb-16" style={{marginBottom: '16px'}}>
          <div className="card-body">
            <div className="card-title">Select Priority *</div>
            <div className="mt-14" style={{marginTop: '14px'}}>
              <div className={`priority-option ${selectedPriority === 'low' ? 'selected low' : ''}`} onClick={() => setSelectedPriority('low')}>
                <div><div className="p-name">Low Priority</div></div><div className="priority-radio"></div>
              </div>
              <div className={`priority-option ${selectedPriority === 'medium' ? 'selected medium' : ''}`} onClick={() => setSelectedPriority('medium')}>
                <div><div className="p-name" style={selectedPriority === 'medium' ? {color: 'var(--warning)'} : {}}>Medium Priority</div></div><div className="priority-radio"></div>
              </div>
              <div className={`priority-option ${selectedPriority === 'high' ? 'selected high' : ''}`} onClick={() => setSelectedPriority('high')}>
                <div><div className="p-name">High Priority</div></div><div className="priority-radio"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card mb-16" style={{marginBottom: '16px'}}>
          <div className="card-body">
            <div className="card-title">Issue Details</div>
            <div className="mt-14" style={{marginTop: '14px'}}>
              <div className="form-group">
                <label>Issue Title *</label>
                <input type="text" placeholder="Brief title of the issue" />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input type="text" placeholder="Room number or area" />
              </div>
              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea placeholder="Describe the issue..."></textarea>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '12px', marginBottom: '20px'}}>
          <button className="btn btn-ghost" style={{flex: 1}} onClick={() => setIsReporting(false)}>Cancel</button>
          <button className="btn btn-primary" style={{flex: 2}} onClick={() => setIsReporting(false)}><span className="btn-text">Submit Issue</span></button>
        </div>
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
        <button className="btn btn-primary" onClick={() => setIsReporting(true)}>+ Report New Issue</button>
      </div>
      
      <div className="stats-grid mb-20" style={{marginBottom: '20px'}}>
        <div className="stat-card"><div className="stat-label">Total Issues <span className="stat-icon">ℹ️</span></div><div className="stat-value">0</div></div>
        <div className="stat-card"><div className="stat-label">Open <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span></div><div className="stat-value" style={{color: 'var(--danger)'}}>0</div></div>
        <div className="stat-card"><div className="stat-label">In Progress <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span></div><div className="stat-value" style={{color: 'var(--warning)'}}>0</div></div>
        <div className="stat-card"><div className="stat-label">Resolved <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>check_circle</span></span></div><div className="stat-value" style={{color: 'var(--success)'}}>0</div></div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <div className="card-title">All Issues</div>
          <div className="mt-14" style={{marginTop: '14px', color: 'var(--text-muted)'}}>
            No issues reported yet.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Issues;
