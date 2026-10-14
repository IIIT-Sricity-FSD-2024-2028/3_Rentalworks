import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

export default function MyBookings() {
  const navigate = useNavigate();
  const { myBookings } = useBooking();
  const { currentUser } = useAuth();

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800 }}>My PG Bookings</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Track your reserved rooms, confirmed stays, and tenant agreements.
          </p>
        </div>
        <button className="btn-nav-outline" onClick={() => navigate('/listings')}>
          + Book Another Room
        </button>
      </div>

      {myBookings.length === 0 ? (
        <div className="empty-state" style={{ background: '#fff', borderRadius: '16px', padding: '48px', border: '1px solid #e5e7eb' }}>
          <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#9ca3af' }}>event_busy</span>
          <h3>No active bookings yet</h3>
          <p>You haven't reserved any PG accommodation. Browse our top verified properties to get started.</p>
          <button className="btn-nav-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/listings')}>
            Explore Available PGs →
          </button>
        </div>
      ) : (
        <div className="bookings-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {myBookings.map((b, idx) => (
            <div key={idx} className="my-booking-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge-confirmed-pill" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                    ✓ Confirmed &amp; Paid
                  </span>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>ID: {b.bookingCode || `BK-${b.id || idx}`}</span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0' }}>{b.property || 'Sunrise PG Residency'}</h3>
                <p style={{ color: '#475569', fontSize: '14px' }}>
                  Room: <strong>{b.roomType || 'Double Sharing'}</strong> (Room #{b.room || '101'}) • Move-in: <strong>{b.checkIn}</strong> • Duration: {b.duration}
                </p>
                {b.credentials?.username && (
                  <p style={{ color: '#ca8a04', fontSize: '13px', marginTop: '6px' }}>
                    👤 Tenant Username: <code>{b.credentials.username}</code>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ca8a04' }}>
                  ₹{(b.payment?.amount || b.rent || 8500).toLocaleString()}
                </div>
                <button
                  className="btn-nav-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => alert(`Showing receipt for ${b.bookingCode || b.id}. Room #${b.room || '101'} is ready for move-in.`)}
                >
                  View Move-in Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
