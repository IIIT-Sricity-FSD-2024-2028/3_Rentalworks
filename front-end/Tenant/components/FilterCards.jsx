// FilterCards.jsx
const FilterCards = ({ complaints, activeFilter, onFilterChange }) => {
  const getCount = (status) => {
    if (status === 'all') return complaints.length;
    return complaints.filter(c => c.status === status).length;
  };

  return (
    <div className="grid-4 mb-20">
      <div 
        className={`stat-card ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onFilterChange('all')}
      >
        <div className="stat-label">All Complaints</div>
        <div className="stat-value">{getCount('all')}</div>
      </div>
      
      <div 
        className={`stat-card ${activeFilter === 'open' ? 'active' : ''}`}
        onClick={() => onFilterChange('open')}
      >
        <div className="stat-label">
          Open <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span>
        </div>
        <div className="stat-value" style={{color: 'var(--danger)'}}>{getCount('open')}</div>
      </div>
      
      <div 
        className={`stat-card ${activeFilter === 'in-progress' ? 'active' : ''}`}
        onClick={() => onFilterChange('in-progress')}
      >
        <div className="stat-label">
          In Progress <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span>
        </div>
        <div className="stat-value" style={{color: 'var(--warning)'}}>{getCount('in-progress')}</div>
      </div>
      
      <div 
        className={`stat-card ${activeFilter === 'resolved' ? 'active' : ''}`}
        onClick={() => onFilterChange('resolved')}
      >
        <div className="stat-label">
          Resolved <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>check_circle</span></span>
        </div>
        <div className="stat-value" style={{color: 'var(--success)'}}>{getCount('resolved')}</div>
      </div>
    </div>
  );
};
