import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  clearCheckoutError,
  isSingleRoom as isSingle,
  selectBooking,
  selectCheckout,
  selectTotals,
  setPaymentMethod,
  submitCheckout,
} from '../features/booking/bookingSlice';
import { toastSuccess } from '../features/ui/uiSlice';

const cardExpired = (exp) => {
  const [m, y] = exp.split('/').map(Number);
  if (!(m >= 1 && m <= 12)) return true;
  return new Date(2000 + y, m, 1) <= new Date(); // valid until the end of the month
};

export default function PaymentGateway() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { selectedPG: pg, selectedRoom, paymentMethod } = useSelector(selectBooking);
  const { rent, deposit, fee, total } = useSelector(selectTotals);
  const checkout = useSelector(selectCheckout);
  const isProcessing = checkout.status === 'loading';
  const isSingleRoom = isSingle(selectedRoom);

  const [upiId, setUpiId] = useState('');
  const [cardData, setCardData] = useState({ number: '', exp: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [formError, setFormError] = useState('');
  const error = formError || checkout.error;

  // Guard: needs a PG + room and a signed-in user. `/payment` links without a
  // booking in progress go to My Bookings, which can resume an unpaid one.
  const invalid = !pg || !selectedRoom || String(pg.id) !== String(id);
  useEffect(() => {
    if (invalid) navigate(id ? `/pg/${id}` : '/my-bookings', { replace: true });
    else if (!currentUser) navigate('/login', { replace: true, state: { from: `/book/${id}/payment` } });
  }, [invalid, currentUser, id, navigate]);

  useEffect(() => {
    dispatch(clearCheckoutError());
  }, [dispatch]);

  if (invalid || !currentUser) return null;

  const pickMethod = (method) => {
    dispatch(setPaymentMethod(method));
    dispatch(clearCheckoutError());
    setFormError('');
  };
  const upiHandle = String(currentUser.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident';

  const formatCardNumber = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExp = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const validate = () => {
    if (paymentMethod === 'upi') {
      if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) return 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank)';
    } else if (paymentMethod === 'card') {
      if (cardData.number.replace(/\s/g, '').length < 16) return 'Please enter a valid 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(cardData.exp)) return 'Please enter expiry in MM/YY format';
      if (cardExpired(cardData.exp)) return 'This card has expired or the expiry month is invalid';
      if (cardData.cvv.length < 3) return 'Please enter a valid 3-digit CVV';
      if (!cardData.name.trim()) return 'Please enter the cardholder name';
    } else if (!selectedBank) {
      return 'Please select your banking institution';
    }
    return '';
  };

  const handleProcessPayment = async () => {
    if (isProcessing) return;
    const problem = validate();
    setFormError(problem);
    if (problem) return;
    const result = await dispatch(submitCheckout({ paymentMethod, upiId: upiId.trim() }));
    if (submitCheckout.fulfilled.match(result)) {
      dispatch(toastSuccess('Payment received. Your bed is booked.'));
      navigate(`/book/${pg.id}/confirmed`, { replace: true });
    }
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
          <div className="step-node done">
            <span className="step-num">✓</span>
            <span className="step-label">Review Details</span>
          </div>
          <div className="step-line active" />
          <div className="step-node active">
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
        {/* LEFT COLUMN: PAYMENT GATEWAY INTERFACE */}
        <div className="review-main-card">
          <div className="step-intro-head">
            <span className="step-tag">Step 3 of 4</span>
            <h2>Select Payment Method</h2>
            <p>Complete your room seat reservation. Your tenant account will be created immediately upon confirmation.</p>
          </div>

          {error && (
            <div className="auth-error-banner" style={{ marginBottom: '20px' }}>
              <span className="material-icons-outlined">error_outline</span>
              {error}
            </div>
          )}

          {/* METHOD SELECTION TABS */}
          <div className="payment-method-selector">
            <button
              className={`pm-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
              onClick={() => pickMethod('upi')}
              type="button"
            >
              <span className="material-icons-outlined">qr_code_2</span>
              <span>UPI / QR</span>
            </button>
            <button
              className={`pm-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => pickMethod('card')}
              type="button"
            >
              <span className="material-icons-outlined">credit_card</span>
              <span>Credit / Debit Card</span>
            </button>
            <button
              className={`pm-tab-btn ${paymentMethod === 'net' ? 'active' : ''}`}
              onClick={() => pickMethod('net')}
              type="button"
            >
              <span className="material-icons-outlined">account_balance</span>
              <span>Net Banking</span>
            </button>
          </div>

          {/* PAYMENT INPUT FORM */}
          <div className="payment-form-box">
            {paymentMethod === 'upi' && (
              <div className="upi-form">
                <div className="quick-upi-apps">
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${upiHandle}@okaxis`)}>
                    GPay (Auto-fill)
                  </span>
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${upiHandle}@ybl`)}>
                    PhonePe
                  </span>
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${upiHandle}@paytm`)}>
                    Paytm
                  </span>
                </div>

                <div className="form-field" style={{ marginTop: '16px' }}>
                  <label>Enter UPI ID (Virtual Payment Address) *</label>
                  <div className="input-box">
                    <span className="material-icons-outlined">alternate_email</span>
                    <input
                      type="text"
                      placeholder="e.g. resident@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                  <span className="input-helper">Test mode: no real payment request is sent.</span>
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="card-form">
                <div className="form-field">
                  <label>Card Number *</label>
                  <div className="input-box">
                    <span className="material-icons-outlined">credit_card</span>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Valid Thru (MM/YY) *</label>
                    <div className="input-box">
                      <span className="material-icons-outlined">event</span>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardData.exp}
                        onChange={(e) => setCardData({ ...cardData, exp: formatExp(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>CVV / CVC *</label>
                    <div className="input-box">
                      <span className="material-icons-outlined">lock</span>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label>Cardholder Name *</label>
                  <div className="input-box">
                    <span className="material-icons-outlined">person</span>
                    <input
                      type="text"
                      placeholder="Name printed on card"
                      value={cardData.name}
                      onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'net' && (
              <div className="net-banking-form">
                <div className="form-field">
                  <label>Select Your Bank *</label>
                  <div className="input-box">
                    <span className="material-icons-outlined">account_balance</span>
                    <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>
                </div>
                <div className="bank-security-notice">
                  <span className="material-icons-outlined">info</span>
                  Test mode: you won't be sent to a real bank.
                </div>
              </div>
            )}
          </div>

          <div className="step-bottom-actions">
            <button className="btn-back-step" onClick={() => navigate(`/book/${pg.id}/review`)} disabled={isProcessing}>
              ← Back to Review
            </button>
            <button
              className="btn-pay-now-action"
              onClick={handleProcessPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="btn-spinner" />
                  Processing payment...
                </>
              ) : (
                <>
                  <span className="material-icons-outlined" style={{ fontSize: '20px' }}>lock</span>
                  Pay ₹{total.toLocaleString()} &amp; Confirm Booking
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR */}
        <div className="review-sidebar">
          <div className="price-summary-card">
            <h3>Order Summary</h3>
            <div className="sidebar-pg-preview">
              <strong>{pg.title}</strong>
              <p>📍 {pg.location}</p>
              <div className="badge-room-type">{selectedRoom?.type}</div>
              {isSingleRoom && (
                <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
                  🔒 Private Single Room (No Roommate)
                </div>
              )}
            </div>

            <div className="cost-breakdown-list">
              <div className="cost-row">
                <span>Monthly Rent</span>
                <strong>₹{rent.toLocaleString()}</strong>
              </div>
              <div className="cost-row">
                <span>Security Deposit</span>
                <strong>₹{deposit.toLocaleString()}</strong>
              </div>
              <div className="cost-row">
                <span>Platform &amp; Onboarding</span>
                <strong>₹{fee.toLocaleString()}</strong>
              </div>
              <hr />
              <div className="cost-row total-row">
                <span>Total Amount</span>
                <span className="total-highlight">₹{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="workflow-guarantee-box">
              <h4>After you pay</h4>
              <ul>
                <li>Your account becomes a <strong>tenant</strong> account</li>
                <li>A bed is assigned and the room's free-bed count goes down</li>
                <li>The warden is told you're moving in</li>
                <li>Your receipt and sign-in details are on the next page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
