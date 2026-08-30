// ComplaintCard.jsx
const ComplaintCard = ({ complaint, onViewDetails }) => {
  const getBadgeStyle = (status) => {
    switch(status) {
      case 'resolved': return { bg: '#dcfce7', color: '#16a34a' };
      case 'in-progress': return { bg: '#fef08a', color: '#b45309' };
      case 'open':
      default: return { bg: '#fee2e2', color: '#dc2626' };
    }
  };

  const badgeStyle = getBadgeStyle(complaint.status);
  const formattedDate = new Date(complaint.filedAt).toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'});

  return (
    <div 
      className="complaint-item" 
      onClick={() => onViewDetails(complaint.id)}
      style={{
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-md)', 
        marginBottom: '14px', 
        background: 'white', 
        padding: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{complaint.title}</strong>
        <span style={{ 
          fontSize: '11px', 
          background: badgeStyle.bg, 
          color: badgeStyle.color, 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontWeight: 'bold' 
        }}>
          {complaint.status.toUpperCase()}
        </span>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px', marginTop: '2px' }}>
        {complaint.desc}
      </p>
      
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: '4px' }}>📅 Filed {formattedDate}</div>
          {complaint.status === 'resolved' ? (
            <div style={{fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600'}}>✓ Resolved</div>
          ) : (
            <div style={{fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600'}}>🕐 {complaint.status === 'open' ? 'Open' : 'In progress'}</div>
          )}
        </div>
      </div>
    </div>
  );
};
