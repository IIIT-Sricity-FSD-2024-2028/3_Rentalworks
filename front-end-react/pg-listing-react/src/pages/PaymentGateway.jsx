import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RAW_LISTINGS } from '../data/listingsData';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3000';

export default function PaymentGateway() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedPG,
    selectedRoom,
    selectedRoommate,
    guestLifestyleProfile,
    moveInDate,
    duration,
    bookingFor,
    friendDetails,
    paymentMethod,
    setPaymentMethod,
    calculateTotal,
    addConfirmedBooking,
  } = useBooking();
  const { currentUser, setSession } = useAuth();

  const [upiId, setUpiId] = useState('');
  const [cardData, setCardData] = useState({ number: '', exp: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const pg = selectedPG || RAW_LISTINGS.find(p => String(p.id) === String(id)) || RAW_LISTINGS[0];
  const { rent, deposit, fee, total } = calculateTotal();
  const isSingleRoom = selectedRoom?.sharing === 'single' || selectedRoom?.capacity === 1 || selectedRoom?.type?.toLowerCase().includes('single') || selectedRoom?.type?.toLowerCase().includes('private');

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

  const handleProcessPayment = async () => {
    setError('');

    // Validation per payment method
    if (paymentMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g., yourname@okhdfcbank)');
        return;
      }
    } else if (paymentMethod === 'card') {
      const plainCard = cardData.number.replace(/\s/g, '');
      if (plainCard.length < 16) {
        setError('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardData.exp.includes('/') || cardData.exp.length < 5) {
        setError('Please enter expiry in MM/YY format');
        return;
      }
      if (cardData.cvv.length < 3) {
        setError('Please enter a valid 3-digit CVV');
        return;
      }
      if (!cardData.name.trim()) {
        setError('Please enter the cardholder name');
        return;
      }
    } else if (paymentMethod === 'net') {
      if (!selectedBank) {
        setError('Please select your banking institution');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const generatedTxnId = `TXN-${Date.now().toString().slice(-6)}`;
      const residentName = bookingFor === 'friend' && friendDetails.name ? friendDetails.name : (currentUser?.name || 'Guest Resident');
      const residentEmail = bookingFor === 'friend' && friendDetails.email ? friendDetails.email : (currentUser?.email || 'guest@example.com');
      const residentPhone = bookingFor === 'friend' && friendDetails.phone ? friendDetails.phone : (currentUser?.phone || '+91 98765 00000');

      // Password for tenant login: use existing session password or default
      const residentPassword = currentUser?.tempPassword || 'tenant123';

      const payload = {
        guestId: currentUser?.id,
        name: residentName,
        email: residentEmail,
        phone: residentPhone,
        password: residentPassword,
        propertyId: pg.id || 1,
        propertyName: pg.title || 'Sunrise PG Residency',
        roomType: selectedRoom?.type || (isSingleRoom ? 'Single Room' : 'Double Sharing'),
        roomNumber: isSingleRoom ? (selectedRoom?.roomNumber || '102') : (selectedRoommate?.roomNum || selectedRoom?.roomNumber || '101'),
        checkIn: moveInDate,
        duration: duration || '6 Months',
        rent: rent,
        deposit: deposit,
        totalAmount: total,
        paymentMethod: paymentMethod.toUpperCase(),
        transactionId: generatedTxnId,
        roommate: isSingleRoom ? null : selectedRoommate,
        lifestyleProfile: isSingleRoom ? null : guestLifestyleProfile,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
      };

      // Call live backend checkout API connected to Neon PostgreSQL
      const res = await fetch(`${API_BASE}/bookings/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Payment processing failed on server');
      }

      const checkoutData = await res.json();

      // Update global context with confirmed booking record and generated tenant credentials
      addConfirmedBooking(
        checkoutData.booking,
        checkoutData.payment,
        checkoutData.credentials
      );

      // Upgrade active session to Tenant
      if (checkoutData.tenant) {
        setSession({
          ...checkoutData.tenant,
          role: 'tenant',
          status: 'active',
          tempPassword: checkoutData.credentials?.password || residentPassword,
        });
      }

      // Small delay for smooth UI transition
      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/book/${pg.id}/confirmed`);
      }, 1200);

    } catch (err) {
      console.error('Checkout error:', err);
      setIsProcessing(false);
      setError(err.message || 'An error occurred while confirming payment. Please retry.');
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
              onClick={() => { setPaymentMethod('upi'); setError(''); }}
              type="button"
            >
              <span className="material-icons-outlined">qr_code_2</span>
              <span>UPI / QR</span>
            </button>
            <button
              className={`pm-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => { setPaymentMethod('card'); setError(''); }}
              type="button"
            >
              <span className="material-icons-outlined">credit_card</span>
              <span>Credit / Debit Card</span>
            </button>
            <button
              className={`pm-tab-btn ${paymentMethod === 'net' ? 'active' : ''}`}
              onClick={() => { setPaymentMethod('net'); setError(''); }}
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
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${currentUser?.name?.toLowerCase().replace(/\s/g, '') || 'resident'}@okaxis`)}>
                    GPay (Auto-fill)
                  </span>
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${currentUser?.name?.toLowerCase().replace(/\s/g, '') || 'resident'}@ybl`)}>
                    PhonePe
                  </span>
                  <span className="quick-upi-chip" onClick={() => setUpiId(`${currentUser?.name?.toLowerCase().replace(/\s/g, '') || 'resident'}@paytm`)}>
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
                  <span className="input-helper">A collect request will be verified instantly in test mode.</span>
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
                  <span className="material-icons-outlined">verified</span>
                  You will be securely authenticated with your selected net banking portal.
                </div>
              </div>
            )}
          </div>

          <div className="step-bottom-actions">
            <button className="btn-back-step" onClick={() => navigate(-1)} disabled={isProcessing}>
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
                  Verifying with Neon Database...
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
              <h4>🚀 What Happens Next:</h4>
              <ul>
                <li>Your guest profile is automatically upgraded to <strong>Tenant</strong></li>
                <li>Your permanent Tenant Login password is saved in PostgreSQL</li>
                <li>Your room seat is locked in the Neon database</li>
                <li>Warden receives immediate move-in notification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
