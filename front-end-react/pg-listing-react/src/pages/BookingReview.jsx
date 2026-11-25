import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, updateMyProfile } from '../features/auth/authSlice';
import { runThunk } from '../app/hooks';
import {
  checkGenderEligibility,
  DURATIONS,
  isSingleRoom as isSingle,
  selectBooking,
  selectTotals,
  setBookingFor,
  setDuration,
  setFriendDetails,
  setMoveInDate,
} from '../features/booking/bookingSlice';
import { toastError } from '../features/ui/uiSlice';

const today = () => new Date().toISOString().split('T')[0];

export default function BookingReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectedPG: pg, selectedRoom, selectedRoommate, moveInDate, duration, bookingFor, friendDetails } = useSelector(selectBooking);
  const { rent, deposit, fee, total } = useSelector(selectTotals);
  const currentUser = useSelector(selectCurrentUser);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  // Guard: the flow needs a PG + room (deep links / new tabs) and a signed-in user.
  const invalid = !pg || !selectedRoom || String(pg.id) !== String(id);
  const isSingleRoom = isSingle(selectedRoom);
  useEffect(() => {
    if (invalid) navigate(`/pg/${id}`, { replace: true });
    else if (!currentUser) navigate('/login', { replace: true, state: { from: `/book/${id}/review` } });
  }, [invalid, currentUser, id, navigate]);

  // Gender policy applies to the person who will actually live there.
  useEffect(() => {
    if (invalid || !currentUser || bookingFor === 'friend') return;
    const eligibility = checkGenderEligibility(pg, currentUser);
    if (!eligibility.ok && !eligibility.needsGender) {
      dispatch(toastError(eligibility.message));
      navigate(`/pg/${pg.id}`, { replace: true });
    }
  }, [invalid, pg, currentUser, bookingFor, navigate, dispatch]);

  if (invalid || !currentUser) return null;

  const validate = () => {
    if (!moveInDate || moveInDate < today()) return 'Please choose a move-in date that is today or later';
    if (bookingFor === 'friend') {
      const email = friendDetails.email.trim().toLowerCase();
      if (!friendDetails.name.trim()) return 'Please provide your friend’s full name';
      if (!/^\+?[\d\s-]{9,}$/.test(friendDetails.phone.trim())) return 'Please provide a valid phone number for your friend';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please provide a valid email for your friend (their tenant account is created with it)';
      if (email === String(currentUser.email || '').toLowerCase()) return 'Your friend’s email must be different from yours';
      if (!friendDetails.gender) return 'Please select your friend’s gender';
      const eligibility = checkGenderEligibility(pg, friendDetails);
      if (!eligibility.ok) return eligibility.message;
    }
    if (!agreeTerms) return 'Please agree to the PG house rules and booking terms to proceed';
    return '';
  };

  const handleProceed = () => {
    let problem = validate();
    // The server needs a gender for every resident, including unisex PGs.
    if (!problem && bookingFor === 'self' && !currentUser.gender) problem = 'Please select your gender to continue';
    setError(problem);
    if (problem) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
                Selected Room: <strong>{selectedRoom.type}</strong> (₹{rent.toLocaleString()}/mo)
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
                  <img src={selectedRoommate.img} alt={selectedRoommate.name} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{selectedRoommate.name}</strong>
                      {selectedRoommate.matchPercentage > 0 && (
                        <span className="compatibility-badge">
                          ⚡ {selectedRoommate.matchPercentage}% Match
                        </span>
                      )}
                    </div>
                    <p>{[selectedRoommate.profession, selectedRoommate.company, selectedRoommate.room].filter(Boolean).join(' • ')}</p>
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
                    min={today()}
                    onChange={(e) => dispatch(setMoveInDate(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Stay Duration *</label>
                <div className="input-box">
                  <span className="material-icons-outlined">timelapse</span>
                  <select value={duration} onChange={(e) => dispatch(setDuration(e.target.value))}>
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
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
                    onChange={() => dispatch(setBookingFor('self'))}
                  />
                  <span>Booking for Myself ({currentUser?.name || 'Guest User'})</span>
                </label>
                <label className={`toggle-option ${bookingFor === 'friend' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="bookingFor"
                    checked={bookingFor === 'friend'}
                    onChange={() => dispatch(setBookingFor('friend'))}
                  />
                  <span>Booking for a Friend / Colleague</span>
                </label>
              </div>

              {bookingFor === 'self' && !currentUser.gender && (
                <div className="form-field" style={{ marginTop: '16px' }}>
                  <label>Your Gender *</label>
                  <div className="input-box">
                    <span className="material-icons-outlined">wc</span>
                    <select
                      value=""
                      onChange={(e) => e.target.value && runThunk(dispatch, updateMyProfile({ gender: e.target.value }), { success: 'Gender saved to your profile' })}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

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
                          onChange={(e) => dispatch(setFriendDetails({ name: e.target.value }))}
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
                          onChange={(e) => dispatch(setFriendDetails({ phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Friend's Email *</label>
                      <div className="input-box">
                        <span className="material-icons-outlined">mail</span>
                        <input
                          type="email"
                          placeholder="friend@example.com"
                          value={friendDetails.email}
                          onChange={(e) => dispatch(setFriendDetails({ email: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Friend's Gender *</label>
                      <div className="input-box">
                        <span className="material-icons-outlined">wc</span>
                        <select value={friendDetails.gender} onChange={(e) => dispatch(setFriendDetails({ gender: e.target.value }))}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
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
                  I agree to the <strong>PG House Rules</strong>, 30-day move-out notice policy, and consent to automatic tenant onboarding upon successful payment.
                </span>
              </label>
            </div>
          </div>

          <div className="step-bottom-actions">
            <button className="btn-back-step" onClick={() => navigate(isSingleRoom ? `/pg/${pg.id}` : `/book/${pg.id}/roommate`)}>
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
                <span>Instant booking confirmation</span>
              </div>
              <div className="assurance-item">
                <span className="material-icons-outlined">lock</span>
                <span>Test-mode checkout, no real money is charged</span>
              </div>
              <div className="assurance-item">
                <span className="material-icons-outlined">assignment_ind</span>
                <span>Your tenant account is activated automatically</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
