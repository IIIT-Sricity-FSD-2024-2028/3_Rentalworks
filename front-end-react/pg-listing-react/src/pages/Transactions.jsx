import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';

export default function Transactions() {
  const navigate = useNavigate();
  const { myTransactions } = useBooking();

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800 }}>Payment Transactions</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Complete audit trail of room deposits and rental transactions.
          </p>
        </div>
        <button className="btn-nav-outline" onClick={() => navigate('/my-bookings')}>
          ← Back to Bookings
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Transaction ID</th>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Description</th>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Method</th>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Amount</th>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Status</th>
              <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {myTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  No payment transactions recorded yet.
                </td>
              </tr>
            ) : (
              myTransactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}><code>{t.id}</code></td>
                  <td style={{ padding: '16px 20px' }}>{t.desc}</td>
                  <td style={{ padding: '16px 20px' }}>{t.method || 'UPI'}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: '#ca8a04' }}>₹{Number(t.amount).toLocaleString()}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                      ✓ Verified
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>{t.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
