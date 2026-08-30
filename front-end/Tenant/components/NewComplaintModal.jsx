// NewComplaintModal.jsx
const { useState } = React;

const NewComplaintModal = ({ isOpen, onClose, onAddComplaint }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [desc, setDesc] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !desc.trim()) {
      alert('Please fill out the title and description.');
      return;
    }

    const newComplaint = {
      id: Date.now(),
      title,
      desc,
      priority,
      status: 'open',
      filedAt: new Date().toISOString()
    };

    onAddComplaint(newComplaint);
    
    // Reset form
    setTitle('');
    setPriority('medium');
    setDesc('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'all' : 'none' }}>
      <div className="modal" style={{ transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)' }}>
        <div className="modal-header">
          <div className="modal-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>chat</span></div>
          <div>
            <div className="modal-title">File New Complaint</div>
            <div className="modal-sub">Report an issue to management</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons-outlined" style={{fontSize: '24px'}}>close</span>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Complaint Title <span style={{color: 'var(--danger)'}}>*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Brief title of your complaint" 
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description <span style={{color: 'var(--danger)'}}>*</span></label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              placeholder="Describe your complaint in detail..."
            ></textarea>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Submit Complaint</button>
        </div>
      </div>
    </div>
  );
};
