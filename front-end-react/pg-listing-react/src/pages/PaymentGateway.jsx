import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  clearCheckoutError,
  isSingleRoom as isSingle,
  selectBooking,
  selectCheckout,
  selectTotals,
  submitCheckout,
  loadPaymentConfig,
  selectPaymentMode,
} from '../features/booking/bookingSlice';
import { toastSuccess } from '../features/ui/uiSlice';

export default function PaymentGateway() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { selectedPG: pg, selectedRoom } = useSelector(selectBooking);
  const { rent, deposit, fee, total } = useSelector(selectTotals);
  const checkout = useSelector(selectCheckout);
  const paymentMode = useSelector(selectPaymentMode);
  const isProcessing = checkout.status === 'loading';
  const isSingleRoom = isSingle(selectedRoom);
  const error = checkout.error;

  // Guard: needs a PG + room and a signed-in user. `/payment` links without a
  // booking in progress go to My Bookings, which can resume an unpaid one.
  const invalid = !pg || !selectedRoom || String(pg.id) !== String(id);
  useEffect(() => {
    if (invalid) navigate(id ? `/pg/${id}` : '/my-bookings', { replace: true });
    else if (!currentUser) navigate('/login', { replace: true, state: { from: `/book/${id}/payment` } });
  }, [invalid, currentUser, id, navigate]);

  useEffect(() => {
    dispatch(clearCheckoutError());
    dispatch(loadPaymentConfig());
  }, [dispatch]);

  if (invalid || !currentUser) return null;

  // Card / UPI / netbanking details are entered in the gateway's own window,
  // never on this page. The server sets and verifies the amount.
  const handleProcessPayment = async () => {
    if (isProcessing) return;
    const result = await dispatch(submitCheckout());
    if (submitCheckout.fulfilled.match(result)) {
      dispatch(toastSuccess(paymentMode === 'test' ? 'Test payment recorded. Your bed is booked.' : 'Payment received. Your bed is booked.'));
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

          {/* PAYMENT: gateway window (Razorpay) or clearly labelled test mode */}
          {paymentMode === 'test' && (
            <div role="note" style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <strong>Test mode — no real money is charged.</strong> Online payments are not connected yet (the server has no
              Razorpay keys), so this booking is recorded as a test payment.
            </div>
          )}
          <div className="payment-form-box" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#4f46e5' }}>verified_user</span>
              <div>
                <strong>{paymentMode === 'test' ? 'Test payment' : 'Secure payment by Razorpay'}</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                  {paymentMode === 'test'
                    ? 'Click Pay to record a test payment and confirm your bed.'
                    : 'Click Pay to open the Razorpay window, then pay by UPI, card or netbanking. Your card details are entered with Razorpay and never reach RentBro.'}
                </p>
              </div>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              The amount is taken from the room's current rent. If the price changed since you chose the room, the payment window shows the correct amount.
            </p>
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
                  {paymentMode === 'test' ? 'Recording test payment...' : 'Waiting for payment...'}
                </>
              ) : (
                <>
                  <span className="material-icons-outlined" style={{ fontSize: '20px' }}>lock</span>
                  {paymentMode === 'test' ? 'Record test payment' : 'Pay'} ₹{total.toLocaleString()} &amp; Confirm Booking
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
