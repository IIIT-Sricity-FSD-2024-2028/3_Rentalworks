import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminComplaints } from '../../../features/admin/adminSlices';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');

export default function Complaints() {
  const dispatch = useDispatch();
  const items = useSelector(adminComplaints.selectors.selectItems);
  const loading = useSelector(adminComplaints.selectors.selectIsLoading) && items.length === 0;
  // Rows may be stored as "in_progress" or "in-progress" depending on who updated them.
  const complaints = items.map((c) => ({ ...c, status: String(c.status || 'open').replace('_', '-') }));
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    dispatch(adminComplaints.thunks.fetchAll());
  }, [dispatch]);

  const filtered = complaints.filter(c => {
    const tenantName = getName(c.tenant);
    const propName = getName(c.property);
    const ms = !search || tenantName.toLowerCase().includes(search.toLowerCase()) || propName.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const mst = statusF === 'all' || c.status === statusF;
    return ms && mst;
  });

  const counts = { total: complaints.length, open: complaints.filter(c => c.status === 'open').length, inProgress: complaints.filter(c => c.status === 'in-progress').length, resolved: complaints.filter(c => c.status === 'resolved').length };

  const setStatus = (c, status, label) =>
    runThunk(dispatch, adminComplaints.thunks.updateItem({ id: c.id, changes: { status } }), { success: `Complaint #${c.id} marked as ${label}` });
  const handleResolve = (c) => setStatus(c, 'resolved', 'resolved');
  const handleInProgress = (c) => setStatus(c, 'in_progress', 'in progress');

  const handleDelete = (c) => {
    setModal({
      type: 'confirm',
      title: 'Delete Complaint',
      message: `Permanently delete complaint #${c.id}?`,
      action: async () => {
        const { ok } = await runThunk(dispatch, adminComplaints.thunks.removeItem(c.id), { success: 'Complaint removed' });
        if (ok) setModal(null);
      },
    });
  };

  const handleView = (c) => { setModal({ type: 'view', complaint: c }); };

  return (
    <>
      <div className="sec-hdr"><h2>Complaints</h2><p>Track and resolve tenant complaints</p></div>
      <div className="user-summary">
        <div className="u-sum-card"><div className="u-sum-label">Total Complaints</div><div className="u-sum-val blue">{counts.total}</div></div>
        <div className="u-sum-card"><div className="u-sum-label">Open</div><div className="u-sum-val" style={{color:'#d97706'}}>{counts.open}</div></div>
        <div className="u-sum-card"><div className="u-sum-label">In Progress</div><div className="u-sum-val purple">{counts.inProgress}</div></div>
        <div className="u-sum-card"><div className="u-sum-label">Resolved</div><div className="u-sum-val green">{counts.resolved}</div></div>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap"><span className="s-ico material-icons-outlined">search</span><input placeholder="Search complaints..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option>
          </select>
        </div>
        <table className="data-tbl">
          <thead><tr><th>ID</th><th>Tenant</th><th>Property</th><th>Description</th><th>Status</th><th>Reported</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7" style={{textAlign:'center',padding:24,color:'#94a3b8'}}>Loading...</td></tr> :
            filtered.length === 0 ? <tr><td colSpan="7" style={{textAlign:'center',padding:24,color:'#94a3b8'}}>No complaints found</td></tr> :
            filtered.map(c => (
              <tr key={c.id}>
                <td style={{fontFamily:'monospace',fontSize:12}}>#{c.id}</td>
                <td><strong>{getName(c.tenant)}</strong></td>
                <td style={{fontSize:12}}>{getName(c.property)}</td>
                <td style={{fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.description}</td>
                <td><span className={`badge badge-${c.status === 'open' ? 'pending' : c.status === 'in-progress' ? 'pending' : 'completed'}`}>{cap(c.status)}</span></td>
                <td style={{fontSize:12}}>{c.reportedAt || '-'}</td>
                <td>
                  <div className="act-icons">
                    <button className="ico-btn" onClick={() => handleView(c)} title="View"><span className="material-icons-outlined" style={{fontSize:14}}>visibility</span></button>
                    {c.status === 'open' && <button className="ico-btn" onClick={() => handleInProgress(c)} title="Mark In Progress"><span className="material-icons-outlined" style={{fontSize:14}}>autorenew</span></button>}
                    {c.status !== 'resolved' && <button className="ico-btn" onClick={() => handleResolve(c)} title="Resolve"><span className="material-icons-outlined" style={{fontSize:14}}>check_circle</span></button>}
                    <button className="ico-btn danger" onClick={() => handleDelete(c)} title="Delete"><span className="material-icons-outlined" style={{fontSize:14}}>delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tbl-footer">Showing {filtered.length} of {complaints.length} complaints</div>
      </div>

      <Modal show={!!modal} onClose={() => setModal(null)} title={modal?.type === 'view' ? 'Complaint Details' : modal?.title || ''} subtitle={modal?.type === 'view' && modal.complaint ? `Issue #${modal.complaint.id}` : ''}
        footer={modal?.type === 'confirm' ? (
          <><button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button><button className="btn-confirm-red" onClick={modal.action}>Confirm</button></>
        ) : <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>}>
        {modal?.type === 'confirm' && <p style={{fontSize:13,lineHeight:1.6,color:'#475569'}}>{modal.message}</p>}
        {modal?.type === 'view' && modal.complaint && (
          <div style={{display:'grid',gap:10,fontSize:13}}>
            <div><strong>Tenant:</strong> {getName(modal.complaint.tenant)}</div>
            <div><strong>Property:</strong> {getName(modal.complaint.property)}</div>
            <div><strong>Description:</strong> {modal.complaint.description}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.complaint.status === 'open' ? 'pending' : modal.complaint.status === 'in-progress' ? 'pending' : 'completed'}`}>{cap(modal.complaint.status)}</span></div>
            <div><strong>Reported:</strong> {modal.complaint.reportedAt || '-'}</div>
          </div>
        )}
      </Modal>
    </>
  );
}
