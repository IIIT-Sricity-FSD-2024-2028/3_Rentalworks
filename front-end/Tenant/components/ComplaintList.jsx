// ComplaintList.jsx
const ComplaintList = ({ complaints, activeFilter, onViewDetails }) => {
  if (complaints.length === 0) {
    const titleMap = {
      'all': 'complaints found',
      'open': 'open complaints',
      'in-progress': 'complaints in progress',
      'resolved': 'resolved complaints'
    };
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'gray' }}>
        <h4>No {titleMap[activeFilter]}</h4>
        <p>There are currently no {titleMap[activeFilter]}.</p>
      </div>
    );
  }

  return (
    <div id="complaints-list">
      {complaints.map(complaint => (
        <ComplaintCard 
          key={complaint.id} 
          complaint={complaint} 
          onViewDetails={onViewDetails} 
        />
      ))}
    </div>
  );
};
