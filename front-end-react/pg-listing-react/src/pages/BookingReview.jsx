import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RAW_LISTINGS } from '../data/listingsData';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

export default function BookingReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedPG,
    selectedRoom,
    selectedRoommate,
    setSelectedRoommate,
    moveInDate,
    setMoveInDate,
    duration,
    setDuration,
    bookingFor,
    setBookingFor,
    friendDetails,
    setFriendDetails,
    calculateTotal,
  } = useBooking();
  const { currentUser } = useAuth();

  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');

  const pg = selectedPG || RAW_LISTINGS.find(p => String(p.id) === String(id)) || RAW_LISTINGS[0];
  const { rent, deposit, fee, total } = calculateTotal();

  const isSingleRoom = selectedRoom?.sharing === 'single' || selectedRoom?.capacity === 1;

  // CRITICAL: Ensure no incompatible roommate is retained
  useEffect(() => {
    if (isSingleRoom && selectedRoommate) {
      setSelectedRoommate(null);
    } else if (selectedRoommate && selectedRoom) {
      const targetSharing = (selectedRoom.sharing || selectedRoom.type || '').toLowerCase();
      const rmSharing = (selectedRoommate.sharing || selectedRoommate.roomType || '').toLowerCase();
      const capacity = Number(selectedRoom.capacity) || 0;
      const isMismatch = (targetSharing.includes('triple') || capacity === 3)
        ? (!rmSharing.includes('triple') && !rmSharing.includes('3'))
        : (targetSharing.includes('double') || capacity === 2)
          ? (!rmSharing.includes('double') && !rmSharing.includes('2'))
          : false;
      if (isMismatch) {
        setSelectedRoommate(null);
      }
    }
  }, [isSingleRoom, selectedRoom, selectedRoommate, setSelectedRoommate]);

  // CRITICAL: Block ineligible male booking on Girls PG
  useEffect(() => {
    const isGirlsPG = (pg.gender || '').toLowerCase() === 'girls' || pg.title?.toLowerCase().includes('girls');
    const uGender = (currentUser?.gender || '').toLowerCase();
    if (isGirlsPG && (uGender === 'male' || uGender === 'boy' || uGender === 'm')) {
      window.alert(`You cannot book this PG! "${pg.title}" is strictly a Girls Only accommodation. Male residents cannot book this property.`);
      navigate(`/pg/${pg.id}`, { replace: true });
    }
  }, [pg, currentUser, navigate]);

  const handleProceed = () => {
    if (!agreeTerms) {
      setError('Please agree to the PG house rules and booking terms to proceed');
      return;
    }
    if (bookingFor === 'friend' && (!friendDetails.name.trim() || !friendDetails.phone.trim())) {
      setError('Please provide your friend’s full name and phone number');
      return;
    }
    setError('');
    navigate(`/book/${pg.id}/payment`);
  };

  return (
    <div className="booking-step-container">
      <div className="booking-stepper-header">
        <div className="stepper-track">
          <div className="step-node done">
            <span className="step-num">✓</span>
            <span className="step-label">{isSingleRoom ? 'Room Selected' : 'Roommate Match'}</span>
          </div>
          <div className="step-line active" />
          <div className="step-node active">
            <span className="step-num">2</span>
            <span className="step-label">Review Details</span>
          </div>
          <div className="step-line" />
          <div className="step-node">
            <span className="step-num">3</span>
            <span className="step-label">Payment</span>
          </div>
          <div className="step-line" />
          <div className="step-node">
            <span className="step-num">4</span>
            <span className="step-label">Confirmed</span>
          </div>
        </div>
      </div>

      <div className="review-layout-grid">
        {/* LEFT COLUMN: CUSTOMIZATION */}
        <div className="review-main-card">
          <div className="step-intro-head">
            <span className="step-tag">Step 2 of 4</span>
            <h2>Review &amp; Customize Booking</h2>
            <p>Verify your move-in schedule and resident details before proceeding to payment.</p>
          </div>

          {error && (
            <div className="auth-error-banner" style={{ marginBottom: '20px' }}>
              <span className="material-icons-outlined">error_outline</span>
              {error}
            </div>
          )}

          {/* PROPERTY SUMMARY STRIP */}
          <div className="review-property-strip">
            <img src={pg.image} alt={pg.title} className="strip-img" />
            <div className="strip-info">
              <h3>{pg.title}</h3>
              <p>📍 {pg.location}</p>
              <span className="strip-room-badge">
                Selected Room: <strong>{selectedRoom?.type || (isSingleRoom ? 'Single Room' : 'Double Sharing')}</strong> (₹{rent.toLocaleString()}/mo)
              </span>
            </div>
          </div>

          {/* ROOMMATE OR PRIVATE ROOM BANNER */}
          {isSingleRoom ? (
            <div className="review-private-room-box" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px 20px', margin: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span className="material-icons-outlined" style={{ fontSize: '26px', color: '#16a34a' }}>
                  lock
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#14532d' }}>
                    Private Single Room (Single Occupancy)
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                    Max Capacity: 1 Person • No Roommate • 100% Private Living Space
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#15803d', paddingLeft: '38px' }}>
                <span>✓ Direct solo reservation — only you will occupy and hold the key to this room.</span>
                <span>✓ No roommate matching required; you will be registered as the sole tenant upon checkout.</span>
              </div>
            </div>
          ) : (
            <div className="review-roommate-box">
              <h4>Assigned Roommate</h4>
              {selectedRoommate ? (
                <div className="rm-mini-profile">
                  <img src={selectedRoommate.img || selectedRoommate.avatar} alt={selectedRoommate.name} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{selectedRoommate.name}</strong>
                      {(selectedRoommate.matchPercentage || selectedRoommate.compatibility) && (
                        <span className="compatibility-badge">
                          ⚡ {selectedRoommate.matchPercentage || selectedRoommate.compatibility}% Match
                        </span>
                      )}
                    </div>
                    <p>{selectedRoommate.job || selectedRoommate.profession} • {selectedRoommate.company} • Room #{selectedRoommate.roomNum}</p>
                  </div>
                </div>
              ) : (
                <p className="no-rm-note">
                  <span className="material-icons-outlined" style={{ fontSize: '18px' }}>info</span>
                  Roommate will be assigned automatically by the warden upon move-in.
                </p>
              )}
            </div>
          )}

          {/* BOOKING DURATION & DATE FORM */}
          <div className="review-form-section">
            <div className="form-grid-2">
              <div className="form-field">
                <label>Move-in Date *</label>
                <div className="input-box">
                  <span className="material-icons-outlined">calendar_today</span>
                  <input
                    type="date"
                    value={moveInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setMoveInDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Stay Duration *</label>
                <div className="input-box">
                  <span className="material-icons-outlined">timelapse</span>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value="1 Month">1 Month (Short Stay)</option>
                    <option value="3 Months">3 Months (Standard)</option>
                    <option value="6 Months">6 Months (Recommended)</option>
                    <option value="11 Months">11 Months (Full Academic/Work Year)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BOOKING FOR TOGGLE */}
            <div className="booking-for-group">
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '10px' }}>Who is this room for?</label>
              <div className="toggle-options">
                <label className={`toggle-option ${bookingFor === 'self' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="bookingFor"
                    checked={bookingFor === 'self'}
                    onChange={() => setBookingFor('self')}
                  />
                  <span>Booking for Myself ({currentUser?.name || 'Guest User'})</span>
                </label>
                <label className={`toggle-option ${bookingFor === 'friend' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="bookingFor"
                    checked={bookingFor === 'friend'}
                    onChange={() => setBookingFor('friend')}
                  />
                  <span>Booking for a Friend / Colleague</span>
                </label>
              </div>

              {bookingFor === 'friend' && (
                <div className="friend-details-inputs" style={{ marginTop: '16px' }}>
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Friend's Full Name *</label>
                      <div className="input-box">
                        <span className="material-icons-outlined">person</span>
                        <input
                          type="text"
                          placeholder="e.g. Sravan Patel"
                          value={friendDetails.name}
                          onChange={(e) => setFriendDetails({ ...friendDetails, name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Friend's Phone Number *</label>
                      <div className="input-box">
                        <span className="material-icons-outlined">phone</span>
                        <input
                          type="tel"
                          placeholder="+91 98765 00000"
                          value={friendDetails.phone}
                          onChange={(e) => setFriendDetails({ ...friendDetails, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TERMS & RULES CHECKBOX */}
            <div className="terms-checkbox-wrap">
              <label>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>
                  I agree to the <strong>PG House Rules</strong>, 30-day move-out notice policy, and consent to automatic tenant onboarding in the database upon successful payment.
                </span>
              </label>
            </div>
          </div>

          <div className="step-bottom-actions">
            <button className="btn-back-step" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button className="btn-primary-action" onClick={handleProceed}>
              Proceed to Payment Gateway →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PRICE SUMMARY STICKY SIDEBAR */}
        <div className="review-sidebar">
          <div className="price-summary-card">
            <h3>Price Summary</h3>
            <p className="summary-sub">Transparent pricing with zero hidden charges</p>

            <div className="cost-breakdown-list">
              <div className="cost-row">
                <span>Monthly Rent ({selectedRoom?.type})</span>
                <strong>₹{rent.toLocaleString()}</strong>
              </div>
              <div className="cost-row">
                <span>Refundable Security Deposit</span>
                <strong>₹{deposit.toLocaleString()}</strong>
              </div>
              <div className="cost-row">
                <span>One-time Onboarding &amp; Verification Fee</span>
                <strong>₹{fee.toLocaleString()}</strong>
              </div>
              <hr />
              <div className="cost-row total-row">
                <span>Total Payable Today</span>
                <span className="total-highlight">₹{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="security-assurances">
              <div className="assurance-item">
                <span className="material-icons-outlined">verified_user</span>
                <span>Instant confirmation in Neon Database</span>
              </div>
              <div className="assurance-item">
                <span className="material-icons-outlined">lock</span>
                <span>Bank-grade 256-bit encrypted checkout</span>
              </div>
              <div className="assurance-item">
                <span className="material-icons-outlined">assignment_ind</span>
                <span>Automatic Tenant Credentials generated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
