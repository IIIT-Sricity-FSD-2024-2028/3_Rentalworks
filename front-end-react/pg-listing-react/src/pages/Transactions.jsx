import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { fetchMyTransactions, selectMyTransactions } from '../features/booking/bookingSlice';

const th = { padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' };
const td = { padding: '16px 20px' };
const PAID = ['verified', 'completed', 'success'];

const describe = (t) => {
  const place = t.property?.name ? ` — ${t.property.name}` : '';
  const room = t.room ? ` (Room ${t.room})` : '';
  return `${t.kind === 'rent' ? 'Monthly rent' : 'Room booking'}${place}${room}`;
};

const fmtDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

export default function Transactions() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { items, status, error } = useSelector(selectMyTransactions);

  useEffect(() => {
    if (user?.id) dispatch(fetchMyTransactions());
  }, [dispatch, user?.id]);

  if (!user) return <Navigate to="/login" replace state={{ from: '/transactions' }} />;

  let message = null;
  if (status === 'loading' && !items.length) message = 'Loading transactions…';
  else if (error) message = error;
  else if (!items.length) message = 'No payment transactions recorded yet.';

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800 }}>Payment Transactions</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Complete audit trail of room deposits and rental transactions.</p>
        </div>
        <button className="btn-nav-outline" onClick={() => navigate('/my-bookings')}>← Back to Bookings</button>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Transaction ID', 'Description', 'Method', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: error ? '#b91c1c' : '#94a3b8' }}>{message}</td>
              </tr>
            ) : (
              items.map((t) => {
                const paid = PAID.includes(String(t.status).toLowerCase());
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 600 }}><code>{t.transactionId || `PAY-${t.id}`}</code></td>
                    <td style={td}>{describe(t)}</td>
                    <td style={td}>{String(t.method || '—').toUpperCase()}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#ca8a04' }}>₹{Number(t.amount || 0).toLocaleString('en-IN')}</td>
                    <td style={td}>
                      <span style={{ background: paid ? '#dcfce7' : '#fef9c3', color: paid ? '#15803d' : '#854d0e', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                        {paid ? 'Paid' : t.status}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#64748b', fontSize: '13px' }}>{fmtDate(t.paidDate || t.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
