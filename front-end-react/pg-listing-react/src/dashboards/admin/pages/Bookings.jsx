import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminBookings } from '../../../features/admin/adminSlices';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const statusLabel = (s) => ({ active: 'Active', confirmed: 'Confirmed', paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled', overdue: 'Overdue', completed: 'Completed' })[s] || cap(s);
const LIVE = ['active', 'confirmed', 'paid'];
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');
const getPhone = (val) => typeof val === 'object' ? (val?.phone || '') : '';

export default function Bookings() {
  const dispatch = useDispatch();
  const bookings = useSelector(adminBookings.selectors.selectItems);
  const loading = useSelector(adminBookings.selectors.selectIsLoading) && bookings.length === 0;
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    dispatch(adminBookings.thunks.fetchAll());
  }, [dispatch]);

  const setStatus = (b, status, success) =>
    runThunk(dispatch, adminBookings.thunks.updateItem({ id: b.id, changes: { status } }), { success });

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const tName = getName(b.tenant).toLowerCase();
    const pName = getName(b.property).toLowerCase();
    const room = String(b.room || '').toLowerCase();
    const ms = !search || tName.includes(q) || pName.includes(q) || room.includes(q);
    const mst = statusF === 'all' || b.status === statusF;
    return ms && mst;
  });

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => LIVE.includes(b.status)).length,
    pending: bookings.filter(b => b.status === 'pending').length,
    overdue: bookings.filter(b => b.status === 'overdue').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  const handleApprove = (b) => setStatus(b, 'confirmed', `${getName(b.tenant)}'s booking is confirmed`);

  const handleReject = (b) => {
    setModal({
      type: 'confirm',
      title: 'Reject Booking',
      message: `Are you sure you want to reject the booking for "${getName(b.tenant)}" at ${getName(b.property)}?`,
      btnClass: 'btn-confirm-red',
      btnText: 'Reject',
      action: async () => {
        const { ok } = await setStatus(b, 'cancelled', `${getName(b.tenant)}'s booking was rejected`);
        if (ok) setModal(null);
      }
    });
  };

  const handleTerminate = (b) => {
    setModal({
      type: 'confirm',
      title: 'Force Terminate',
      message: `Are you sure you want to terminate "${getName(b.tenant)}"'s booking? This action cannot be undone.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Terminate',
      action: async () => {
        const { ok } = await setStatus(b, 'cancelled', `${getName(b.tenant)}'s booking was terminated`);
        if (ok) setModal(null);
      }
    });
  };

  const handleView = (b) => {
    setModal({ type: 'view', booking: b });
  };

  return (
    <>
      <div className="sec-hdr">
        <h2>Booking Management</h2>
        <p>Monitor and manage tenant bookings and lifecycle actions</p>
      </div>

      {/* 5 KPI Cards matching traditional */}
      <div className="booking-summary">
        <div className="u-sum-card">
          <div className="u-sum-label">Total Bookings</div>
          <div className="u-sum-val">{stats.total}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Active</div>
          <div className="u-sum-val green">{stats.active}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Pending</div>
          <div className="u-sum-val" style={{ color: '#d97706' }}>{stats.pending}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Overdue</div>
          <div className="u-sum-val red">{stats.overdue}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Cancelled</div>
          <div className="u-sum-val red">{stats.cancelled}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
            <input
              placeholder="Search by tenant, property, or room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <table className="data-tbl">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Duration</th>
              <th>Rent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Loading bookings...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No bookings found</td></tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <strong>{getName(b.tenant)}</strong>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.phone || getPhone(b.tenant) || '-'}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{getName(b.property)}</td>
                  <td><span className="room-chip">{b.room}</span></td>
                  <td style={{ fontSize: 12 }}>📅 {b.checkIn}</td>
                  <td style={{ fontSize: 12 }}>⏱ {b.duration}</td>
                  <td style={{ fontSize: 12 }}>₹{(Number(b.rent) || 0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span></td>
                  <td>
                    <div className="act-icons">
                      {b.status === 'pending' && (
                        <>
                          <button className="ico-btn" onClick={() => handleApprove(b)} title="Approve">✅</button>
                          <button className="ico-btn danger" onClick={() => handleReject(b)} title="Reject">❌</button>
                        </>
                      )}
                      {(LIVE.includes(b.status) || b.status === 'overdue') && (
                        <>
                          <button className="ico-btn" onClick={() => handleView(b)} title="View Details">👁️</button>
                          <button className="ico-btn danger" onClick={() => handleTerminate(b)} title="Force Terminate">🔴</button>
                        </>
                      )}
                      {!LIVE.includes(b.status) && b.status !== 'overdue' && (
                        <button className="ico-btn" onClick={() => handleView(b)} title="View Details">👁️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="tbl-footer">Showing {filtered.length} of {bookings.length} bookings</div>
      </div>

      {/* Modal */}
      <Modal
        show={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title || '📅 Booking Details'}
        subtitle={modal?.type === 'view' && modal.booking ? `Room ${modal.booking.room} at ${getName(modal.booking.property)}` : ''}
        footer={
          modal?.type === 'confirm' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className={modal.btnClass || 'btn-confirm-red'} onClick={modal.action}>
                {modal.btnText || 'Confirm'}
              </button>
            </>
          ) : (
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          )
        }
      >
        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{modal.message}</p>
        )}
        {modal?.type === 'view' && modal.booking && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Tenant:</strong> {getName(modal.booking.tenant)}</div>
            <div><strong>Phone:</strong> {modal.booking.phone || getPhone(modal.booking.tenant) || '-'}</div>
            <div><strong>Property:</strong> {getName(modal.booking.property)}</div>
            <div><strong>Room:</strong> {modal.booking.room}</div>
            <div><strong>Check-in:</strong> {modal.booking.checkIn}</div>
            <div><strong>Duration:</strong> {modal.booking.duration}</div>
            <div><strong>Monthly Rent:</strong> ₹{(Number(modal.booking.rent) || 0).toLocaleString('en-IN')}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.booking.status}`}>{statusLabel(modal.booking.status)}</span></div>
          </div>
        )}
      </Modal>
    </>
  );
}
