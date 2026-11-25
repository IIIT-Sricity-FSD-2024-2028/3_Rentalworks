import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../app/hooks';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  cancelMyBooking,
  fetchMyBookings,
  selectMyBookings,
  setDuration,
  setMoveInDate,
  startBooking,
} from '../features/booking/bookingSlice';
import { mapRoom, normaliseGender, DEFAULT_IMAGES } from '../features/listings/listingMappers';

const codeOf = (b) => `BK-${String(b.id).padStart(5, '0')}`;
const roomOf = (b) => b.room || b.roomEntity?.roomNumber || 'To be assigned';

export default function MyBookings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { items: bookings, status, error } = useSelector(selectMyBookings);
  const loading = (status === 'idle' || status === 'loading') && bookings.length === 0;
  const [pass, setPass] = useState(null);

  useEffect(() => {
    if (currentUser?.id) dispatch(fetchMyBookings());
  }, [dispatch, currentUser?.id]);

  // Resume an unpaid booking: load it into the booking flow and go to review.
  const handleCompletePayment = (b) => {
    const propertyId = b.propertyId ?? b.property?.id;
    if (!b.roomEntity) {
      navigate(`/pg/${propertyId}`);
      return;
    }
    const room = mapRoom(b.roomEntity);
    dispatch(
      startBooking({
        pg: {
          id: propertyId,
          title: b.property?.name || 'PG',
          location: b.property?.location || '',
          image: b.property?.images?.[0] || DEFAULT_IMAGES[0],
          gender: normaliseGender(b.property?.gender),
          price: room.rent,
        },
        room,
        pendingBookingId: b.id,
      }),
    );
    const today = new Date().toISOString().split('T')[0];
    const checkIn = String(b.checkIn || '').slice(0, 10);
    dispatch(setMoveInDate(checkIn >= today ? checkIn : today));
    if (b.duration) dispatch(setDuration(b.duration));
    navigate(`/book/${propertyId}/review`);
  };

  const handleCancel = (b) => {
    if (!window.confirm(`Cancel booking request ${codeOf(b)}?`)) return;
    runThunk(dispatch, cancelMyBooking(b.id), { success: 'Booking request cancelled' });
  };

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
            <button className="btn-nav-primary" onClick={() => navigate('/login', { state: { from: '/my-bookings' } })}>
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
      ) : error && bookings.length === 0 ? (
        <div className="empty-state" style={{ background: '#fff', borderRadius: '16px', padding: '48px', border: '1px solid #e5e7eb' }}>
          <h3>Could not load your bookings</h3>
          <p>{error}</p>
          <button className="btn-nav-primary" style={{ marginTop: '16px' }} onClick={() => dispatch(fetchMyBookings())}>Retry</button>
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
                    <span style={{ color: '#64748b', fontSize: '13px' }}>ID: {codeOf(b)}</span>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0' }}>{b.property?.name || 'PG accommodation'}</h3>
                  <p style={{ color: '#475569', fontSize: '14px' }}>
                    Room: <strong>{b.roomEntity ? mapRoom(b.roomEntity).type : 'Room'}</strong> (#{roomOf(b)}{b.bedNumber ? `, Bed ${b.bedNumber}` : ''}) • Move-in: <strong>{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : 'Immediate'}</strong> • Duration: {b.duration || '—'}
                  </p>
                  {currentUser?.username && (
                    <p style={{ color: '#ca8a04', fontSize: '13px', marginTop: '6px' }}>
                      👤 Tenant Account: <code>{currentUser.username}</code>
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ca8a04' }}>
                    ₹{Number(b.rent || 0).toLocaleString('en-IN')}/mo
                  </div>
                  {isConfirmed ? (
                    <button
                      className="btn-nav-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={() => setPass(b)}
                    >
                      View Move-in Pass
                    </button>
                  ) : isPending ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {currentUser.role === 'tenant' && (
                        <button className="btn-nav-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleCancel(b)}>
                          Cancel
                        </button>
                      )}
                      <button
                        className="btn-nav-primary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: '#b45309' }}
                        onClick={() => handleCompletePayment(b)}
                      >
                        Complete Payment →
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pass && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Move-in pass" onClick={() => setPass(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 'min(420px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Move-in Pass</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Show this to your warden at check-in.</p>
            {[
              ['Booking', codeOf(pass)],
              ['Resident', currentUser.name],
              ['Property', pass.property?.name || '—'],
              ['Room / Bed', `#${roomOf(pass)}${pass.bedNumber ? ` / ${pass.bedNumber}` : ''}`],
              ['Move-in date', pass.checkIn ? new Date(pass.checkIn).toLocaleDateString('en-IN') : '—'],
              ['Duration', pass.duration || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn-nav-outline" onClick={() => setPass(null)}>Close</button>
              <button className="btn-nav-primary" onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
