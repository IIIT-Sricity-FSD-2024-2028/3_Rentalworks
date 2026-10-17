import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const statusLabel = (s) => ({ active: 'Active', paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled', overdue: 'Overdue', completed: 'Completed' })[s] || cap(s);
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');
const getPhone = (val) => typeof val === 'object' ? (val?.phone || '') : '';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const bList = await api.getBookings();
      setBookings(Array.isArray(bList) ? bList : []);
    } catch {
      toast('error', 'Error', 'Failed to load bookings');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const tName = getName(b.tenant).toLowerCase();
    const pName = getName(b.property).toLowerCase();
    const room = (b.room || '').toLowerCase();
    const ms = !search || tName.includes(q) || pName.includes(q) || room.includes(q);
    const mst = statusF === 'all' || b.status === statusF;
    return ms && mst;
  });

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active' || b.status === 'paid').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    overdue: bookings.filter(b => b.status === 'overdue').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  const handleApprove = async (b) => {
    try {
      await api.updateBooking(b.id, { status: 'active' });
      setBookings(prev => prev.map(x => String(x.id) === String(b.id) ? { ...x, status: 'active' } : x));
      toast('success', 'Booking Approved', `${getName(b.tenant)} booking conditionally unlocked`);
    } catch {
      toast('error', 'Error', 'Failed to approve booking');
    }
  };

  const handleReject = (b) => {
    setModal({
      type: 'confirm',
      title: 'Reject Booking',
      message: `Are you sure you want to reject the booking for <strong>${getName(b.tenant)}</strong> at ${getName(b.property)}?`,
      btnClass: 'btn-confirm-red',
      btnText: 'Reject',
      action: async () => {
        try {
          await api.updateBooking(b.id, { status: 'cancelled' });
          setBookings(prev => prev.map(x => String(x.id) === String(b.id) ? { ...x, status: 'cancelled' } : x));
          toast('error', 'Booking Rejected', `${getName(b.tenant)} booking has been cancelled`);
        } catch {}
        setModal(null);
      }
    });
  };

  const handleTerminate = (b) => {
    setModal({
      type: 'confirm',
      title: 'Force Terminate',
      message: `Are you sure you want to terminate <strong>${getName(b.tenant)}</strong>'s booking? This action cannot be undone.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Terminate',
      action: async () => {
        try {
          await api.updateBooking(b.id, { status: 'cancelled' });
          setBookings(prev => prev.map(x => String(x.id) === String(b.id) ? { ...x, status: 'cancelled' } : x));
          toast('warning', 'Booking Terminated', `${getName(b.tenant)} booking terminated and refund queued if applicable`);
        } catch {}
        setModal(null);
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
                      {(b.status === 'active' || b.status === 'paid' || b.status === 'overdue') && (
                        <>
                          <button className="ico-btn" onClick={() => handleView(b)} title="View Details">👁️</button>
                          <button className="ico-btn danger" onClick={() => handleTerminate(b)} title="Force Terminate">🔴</button>
                        </>
                      )}
                      {b.status === 'cancelled' && (
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
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }} dangerouslySetInnerHTML={{ __html: modal.message }} />
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
