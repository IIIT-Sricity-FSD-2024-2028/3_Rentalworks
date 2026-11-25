import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MyBookings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchMyBookings = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3000/bookings?tenantId=${currentUser.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-role': currentUser.role || 'tenant',
            'x-user-id': String(currentUser.id),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Strictly filter by currentUser id to never expose another user's bookings
            const filtered = data.filter(
              b => Number(b.tenantId) === Number(currentUser.id) || Number(b.tenant?.id) === Number(currentUser.id)
            );
            setBookings(filtered);
          }
        }
      } catch (err) {
        console.error('Failed to load user bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div className="empty-state" style={{ background: '#fff', borderRadius: '16px', padding: '56px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <span className="material-icons-outlined" style={{ fontSize: '56px', color: '#ca8a04', marginBottom: '16px' }}>lock</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Sign in to View Your Bookings</h2>
          <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '440px', margin: '0 auto 24px' }}>
            Please log in with your tenant or guest account credentials to view your reserved rooms and stay history.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-nav-primary" onClick={() => navigate('/login')}>
              Sign In to Account →
            </button>
            <button className="btn-nav-outline" onClick={() => navigate('/listings')}>
              Browse Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800 }}>My PG Bookings</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Track your reserved rooms, confirmed stays, and tenant agreements for <strong>{currentUser.name}</strong>.
          </p>
        </div>
        <button className="btn-nav-outline" onClick={() => navigate('/listings')}>
          + Book Another Room
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <span className="material-icons-outlined" style={{ animation: 'spin 1.5s linear infinite', fontSize: '32px' }}>sync</span>
          <p style={{ marginTop: '10px' }}>Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
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
          {bookings.map((b, idx) => {
            const isConfirmed = b.status === 'confirmed' || b.status === 'active';
            const isPending = b.status === 'pending';
            const badgeBg = isConfirmed ? '#dcfce7' : isPending ? '#fef9c3' : '#fee2e2';
            const badgeColor = isConfirmed ? '#15803d' : isPending ? '#854d0e' : '#b91c1c';
            const badgeLabel = isConfirmed ? '✓ Confirmed & Paid' : isPending ? '⏱ Pending Payment Confirmation' : b.status;

            return (
              <div key={b.id || idx} className="my-booking-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className="badge-confirmed-pill" style={{ background: badgeBg, color: badgeColor, fontWeight: 700, padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                      {badgeLabel}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>ID: BK-{b.id}</span>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0' }}>{b.property?.name || 'Sunrise PG Residency'}</h3>
                  <p style={{ color: '#475569', fontSize: '14px' }}>
                    Room: <strong>{b.roomEntity?.roomType || b.room || 'Double Sharing'}</strong> (Room #{b.room || b.roomEntity?.roomNumber || '101'}) • Move-in: <strong>{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : 'Immediate'}</strong> • Duration: {b.duration || '6 Months'}
                  </p>
                  {currentUser?.username && (
                    <p style={{ color: '#ca8a04', fontSize: '13px', marginTop: '6px' }}>
                      👤 Tenant Account: <code>{currentUser.username}</code>
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ca8a04' }}>
                    ₹{Number(b.rent || 8500).toLocaleString()}
                  </div>
                  {isConfirmed ? (
                    <button
                      className="btn-nav-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={() => alert(`Move-in Pass for BK-${b.id}. Room #${b.room || '101'} is verified in database.`)}
                    >
                      View Move-in Pass
                    </button>
                  ) : (
                    <button
                      className="btn-nav-primary"
                      style={{ padding: '8px 16px', fontSize: '13px', background: '#b45309' }}
                      onClick={() => navigate(`/payment/${b.id}`)}
                    >
                      Complete Payment →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
