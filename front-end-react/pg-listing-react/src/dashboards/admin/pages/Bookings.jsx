import { useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminBookings } from '../../../features/admin/adminSlices';
import Modal from '../components/Modal';
import BookingRequestsPanel from '../components/BookingRequestsPanel';
import { formatDuration, formatDate, formatINR } from '../../../utils/normalize';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const statusLabel = (s) => ({ active: 'Active', confirmed: 'Confirmed', paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled', overdue: 'Overdue', completed: 'Completed' })[s] || cap(s);
const LIVE = ['active', 'confirmed', 'paid'];
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');
const getPhone = (val) => typeof val === 'object' ? (val?.phone || '') : '';

export default function Bookings() {
  const dispatch = useDispatch();
  const bookings = useSelector(adminBookings.selectors.selectItems);
  const loading = useSelector(adminBookings.selectors.selectIsLoading) && bookings.length === 0;
  const [search, setSearch] = useScreenState('');
  const [statusF, setStatusF] = useScreenState('all');
  const [modal, setModal] = useScreenState(null);
  const selectedBooking = useSelector((state) => adminBookings.selectors.selectById(state, modal?.bookingId));

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
      bookingId: b.id,
      outcome: 'rejected',
    });
  };

  const handleTerminate = (b) => {
    setModal({
      type: 'confirm',
      title: 'Force Terminate',
      message: `Are you sure you want to terminate "${getName(b.tenant)}"'s booking? This action cannot be undone.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Terminate',
      bookingId: b.id,
      outcome: 'terminated',
    });
  };

  const handleView = (b) => {
    setModal({ type: 'view', bookingId: b.id });
  };

  async function confirmCancellation() {
    if (!selectedBooking) return;
    const { ok } = await setStatus(selectedBooking, 'cancelled', `${getName(selectedBooking.tenant)}'s booking was ${modal.outcome}`);
    if (ok) setModal(null);
  }

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
                  <td style={{ fontSize: 12 }}>📅 {formatDate(b.checkIn)}</td>
                  <td style={{ fontSize: 12 }}>⏱ {formatDuration(b.duration)}</td>
                  <td style={{ fontSize: 12 }}>{formatINR(b.rent)}</td>
                  <td><span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span></td>
                  <td>
                    <div className="act-icons">
                      {b.status === 'pending' && (
                        <>
                          <button className="ico-btn ok" onClick={() => handleApprove(b)} title="Approve"><span className="material-icons-outlined">check</span></button>
                          <button className="ico-btn danger" onClick={() => handleReject(b)} title="Reject"><span className="material-icons-outlined">close</span></button>
                        </>
                      )}
                      {(LIVE.includes(b.status) || b.status === 'overdue') && (
                        <>
                          <button className="ico-btn view" onClick={() => handleView(b)} title="View Details"><span className="material-icons-outlined">visibility</span></button>
                          <button className="ico-btn danger" onClick={() => handleTerminate(b)} title="Force Terminate"><span className="material-icons-outlined">cancel</span></button>
                        </>
                      )}
                      {!LIVE.includes(b.status) && b.status !== 'overdue' && (
                        <button className="ico-btn view" onClick={() => handleView(b)} title="View Details"><span className="material-icons-outlined">visibility</span></button>
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

      <BookingRequestsPanel />

      {/* Modal */}
      <Modal
        show={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title || '📅 Booking Details'}
        subtitle={modal?.type === 'view' && selectedBooking ? `Room ${selectedBooking.room} at ${getName(selectedBooking.property)}` : ''}
        footer={
          modal?.type === 'confirm' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className={modal.btnClass || 'btn-confirm-red'} onClick={confirmCancellation} disabled={!selectedBooking}>
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
        {modal?.type === 'view' && selectedBooking && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Tenant:</strong> {getName(selectedBooking.tenant)}</div>
            <div><strong>Phone:</strong> {selectedBooking.phone || getPhone(selectedBooking.tenant) || '-'}</div>
            <div><strong>Property:</strong> {getName(selectedBooking.property)}</div>
            <div><strong>Room:</strong> {selectedBooking.room}</div>
            <div><strong>Check-in:</strong> {selectedBooking.checkIn}</div>
            <div><strong>Duration:</strong> {formatDuration(selectedBooking.duration)}</div>
            <div><strong>Monthly Rent:</strong> ₹{(Number(selectedBooking.rent) || 0).toLocaleString('en-IN')}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${selectedBooking.status}`}>{statusLabel(selectedBooking.status)}</span></div>
          </div>
        )}
      </Modal>
    </>
  );
}
