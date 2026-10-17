import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import './Payments.css';

// Luhn algorithm for strict credit/debit card checksum validation
const isValidLuhn = (val) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = val.length - 1; i >= 0; i--) {
    let digit = parseInt(val.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

// Card brand detection based on BIN
const getCardBrand = (num) => {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
  if (/^(60|65|81|82)/.test(clean)) return 'RUPAY';
  if (/^3[47]/.test(clean)) return 'AMEX';
  return 'DEBIT / CREDIT';
};

const Payments = () => {
  const { tenant, activeBooking } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);

  // Form states for each payment channel
  const [upiForm, setUpiForm] = useState({ upiId: '' });
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    cardCvv: '',
  });
  const [netBankingForm, setNetBankingForm] = useState({
    bank: '',
    customerId: '',
  });

  // Strict validation error tracking
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchPayments = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const data = await apiFetch('/payments');
      const userPayments = Array.isArray(data)
        ? data.filter((p) => p.tenantId === tenant.id)
        : [];
      setPayments(userPayments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [tenant]);

  // Determine current cycle and whether current month's rent has been paid
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRent = activeBooking ? Number(activeBooking.rent || 0) : 0;

  // Payments completed for the current billing cycle
  const currentMonthPayments = payments.filter((p) => {
    const isCompleted =
      p.status === 'completed' || p.status === 'success' || p.status === 'verified';
    if (!isCompleted) return false;
    const d = new Date(p.paidDate || p.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const paidThisMonth = currentMonthPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  // When paidThisMonth >= monthlyRent, rent is cleared and upcoming payment card vanishes
  const isPaidThisMonth = monthlyRent > 0 ? paidThisMonth >= monthlyRent : false;
  const remainingPending = isPaidThisMonth ? 0 : Math.max(0, monthlyRent - paidThisMonth);

  // Next Rent Due calculation
  let dueMonth = currentMonth;
  let dueYear = currentYear;
  if (new Date().getDate() > 10) {
    dueMonth++;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear++;
    }
  }
  const rentDueDate = new Date(dueYear, dueMonth, 10).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Strict Field Validation
  const validateField = (name, value, method = paymentMethod) => {
    if (method === 'upi') {
      if (name === 'upiId') {
        const val = (value || '').trim();
        if (!val) return 'UPI ID is required.';
        if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val)) {
          return 'Enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)';
        }
      }
    } else if (method === 'card') {
      if (name === 'cardNumber') {
        const clean = (value || '').replace(/\D/g, '');
        if (!clean) return 'Card number is required.';
        if (clean.length !== 16) return 'Card number must be exactly 16 digits.';
        if (!isValidLuhn(clean)) return 'Invalid card number (checksum failed).';
      }
      if (name === 'cardHolder') {
        const val = (value || '').trim();
        if (!val) return 'Cardholder name is required.';
        if (!/^[a-zA-Z\s]{3,40}$/.test(val)) {
          return 'Enter a valid name (letters only, min 3 characters).';
        }
      }
      if (name === 'cardExpiry') {
        const val = (value || '').trim();
        if (!val) return 'Expiry date is required.';
        if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(val)) {
          return 'Enter valid expiry format (MM/YY).';
        }
        const [mStr, yStr] = val.split('/');
        const m = parseInt(mStr, 10);
        const y = 2000 + parseInt(yStr, 10);
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;
        if (y < curY || (y === curY && m < curM)) {
          return 'Card has already expired.';
        }
        if (y > curY + 20) {
          return 'Invalid expiry year.';
        }
      }
      if (name === 'cardCvv') {
        const clean = (value || '').replace(/\D/g, '');
        if (!clean) return 'CVV is required.';
        if (clean.length < 3 || clean.length > 4) {
          return 'CVV must be 3 or 4 digits.';
        }
      }
    } else if (method === 'netbanking') {
      if (name === 'bank') {
        if (!value || !value.trim()) return 'Please select your bank.';
      }
      if (name === 'customerId') {
        const val = (value || '').trim();
        if (!val) return 'Customer ID or Account Number is required.';
        if (!/^[a-zA-Z0-9]{6,20}$/.test(val)) {
          return 'Enter valid ID or Account Number (min 6 characters).';
        }
      }
    }
    return '';
  };

  // Validate entire active method
  const validateCurrentForm = () => {
    const newErrors = {};
    if (paymentMethod === 'upi') {
      const err = validateField('upiId', upiForm.upiId, 'upi');
      if (err) newErrors.upiId = err;
    } else if (paymentMethod === 'card') {
      const numErr = validateField('cardNumber', cardForm.cardNumber, 'card');
      if (numErr) newErrors.cardNumber = numErr;

      const holderErr = validateField('cardHolder', cardForm.cardHolder, 'card');
      if (holderErr) newErrors.cardHolder = holderErr;

      const expErr = validateField('cardExpiry', cardForm.cardExpiry, 'card');
      if (expErr) newErrors.cardExpiry = expErr;

      const cvvErr = validateField('cardCvv', cardForm.cardCvv, 'card');
      if (cvvErr) newErrors.cardCvv = cvvErr;
    } else if (paymentMethod === 'netbanking') {
      const bankErr = validateField('bank', netBankingForm.bank, 'netbanking');
      if (bankErr) newErrors.bank = bankErr;

      const idErr = validateField('customerId', netBankingForm.customerId, 'netbanking');
      if (idErr) newErrors.customerId = idErr;
    }
    return newErrors;
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    let val = '';
    if (paymentMethod === 'upi') val = upiForm[fieldName];
    if (paymentMethod === 'card') val = cardForm[fieldName];
    if (paymentMethod === 'netbanking') val = netBankingForm[fieldName];
    const err = validateField(fieldName, val, paymentMethod);
    setErrors((prev) => ({ ...prev, [fieldName]: err }));
  };

  // Card input formatters
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardForm((prev) => ({ ...prev, cardNumber: formatted }));
    if (touched.cardNumber) {
      const err = validateField('cardNumber', formatted, 'card');
      setErrors((prev) => ({ ...prev, cardNumber: err }));
    }
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardForm((prev) => ({ ...prev, cardExpiry: raw }));
    if (touched.cardExpiry) {
      const err = validateField('cardExpiry', raw, 'card');
      setErrors((prev) => ({ ...prev, cardExpiry: err }));
    }
  };

  const handleCvvChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardForm((prev) => ({ ...prev, cardCvv: raw }));
    if (touched.cardCvv) {
      const err = validateField('cardCvv', raw, 'card');
      setErrors((prev) => ({ ...prev, cardCvv: err }));
    }
  };

  // Submit payment handler with strict validation
  const handleProcessPayment = async (e) => {
    if (e) e.preventDefault();

    if (!activeBooking) {
      alert('No active stay or booking found to pay for.');
      return;
    }

    // Trigger strict validation on all fields
    const formErrors = validateCurrentForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      // Mark all fields in current method as touched
      if (paymentMethod === 'upi') {
        setTouched({ upiId: true });
      } else if (paymentMethod === 'card') {
        setTouched({ cardNumber: true, cardHolder: true, cardExpiry: true, cardCvv: true });
      } else if (paymentMethod === 'netbanking') {
        setTouched({ bank: true, customerId: true });
      }
      return;
    }

    try {
      setProcessing(true);

      const txnId = `TXN-${Date.now()}`;
      const payableAmount = remainingPending > 0 ? remainingPending : monthlyRent;

      const payload = {
        tenantId: Number(tenant.id),
        propertyId: Number(activeBooking.propertyId),
        roomId: activeBooking.roomId ? Number(activeBooking.roomId) : undefined,
        room: String(activeBooking.room || '101'),
        amount: Number(payableAmount),
        method: paymentMethod,
        transactionId: txnId,
        status: 'completed',
        clearance: 'Approved',
      };

      // Record transaction into PostgreSQL backend
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Prepare receipt data
      const now = new Date();
      setReceiptData({
        transactionId: txnId,
        amount: payableAmount,
        method: paymentMethod.toUpperCase(),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        propertyName: activeBooking?.property?.name || 'Sunrise PG Residency',
        room: activeBooking?.room || '101',
        tenantName: tenant.name || 'Tenant',
        status: 'Completed',
      });

      // Reset forms
      setUpiForm({ upiId: '' });
      setCardForm({ cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '' });
      setNetBankingForm({ bank: '', customerId: '' });
      setErrors({});
      setTouched({});

      // Refresh payments list from backend
      await fetchPayments();

      // Exit payment modal and show receipt
      setIsPaying(false);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert(error.message || 'Payment failed. Please check your details and try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Open receipt modal for past transaction
  const handleViewReceipt = (payment) => {
    const d = new Date(payment.paidDate || payment.createdAt);
    setReceiptData({
      transactionId: payment.transactionId || `TXN-${payment.id}`,
      amount: Number(payment.amount),
      method: (payment.method || 'UPI').toUpperCase(),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      propertyName: activeBooking?.property?.name || 'Sunrise PG Residency',
      room: payment.room || activeBooking?.room || '101',
      tenantName: tenant?.name || 'Tenant',
      status: payment.status === 'completed' || payment.status === 'success' ? 'Completed' : payment.status,
    });
    setShowReceiptModal(true);
  };

  // PAYMENT GATEWAY VIEW
  if (isPaying) {
    const currentPayable = remainingPending > 0 ? remainingPending : monthlyRent;

    return (
      <div className="payments-page">
        {/* Processing Spinner Overlay */}
        {processing && (
          <div className="gateway-processing-overlay">
            <div className="processing-modal-card">
              <div className="processing-spinner-ring"></div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Processing Payment...
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Connecting securely to banking network. Please do not refresh or close this tab.
              </p>
            </div>
          </div>
        )}

        <button
          className="btn btn-ghost btn-sm mb-16"
          onClick={() => {
            setIsPaying(false);
            setErrors({});
            setTouched({});
          }}
          style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          disabled={processing}
        >
          <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Cancel Payment
        </button>

        <div className="payment-flow-layout">
          <div>
            {/* Step 1: Payment Channel Tiles */}
            <div className="card mb-16" style={{ marginBottom: '16px' }}>
              <div className="card-body">
                <div className="card-title">Select Payment Method</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
                  Choose your preferred payment mode with 256-bit bank encryption.
                </p>

                <div className="payment-methods-grid">
                  <div
                    className={`payment-method-tile ${paymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => {
                      if (!processing) {
                        setPaymentMethod('upi');
                        setErrors({});
                      }
                    }}
                  >
                    <div className="method-tile-icon">
                      <span className="material-icons-outlined" style={{ fontSize: '24px' }}>smartphone</span>
                    </div>
                    <div className="method-tile-label">UPI</div>
                    <div className="method-tile-sub">Instant 0% Fee</div>
                  </div>

                  <div
                    className={`payment-method-tile ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => {
                      if (!processing) {
                        setPaymentMethod('card');
                        setErrors({});
                      }
                    }}
                  >
                    <div className="method-tile-icon">
                      <span className="material-icons-outlined" style={{ fontSize: '24px' }}>credit_card</span>
                    </div>
                    <div className="method-tile-label">Cards</div>
                    <div className="method-tile-sub">Debit &amp; Credit</div>
                  </div>

                  <div
                    className={`payment-method-tile ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                    onClick={() => {
                      if (!processing) {
                        setPaymentMethod('netbanking');
                        setErrors({});
                      }
                    }}
                  >
                    <div className="method-tile-icon">
                      <span className="material-icons-outlined" style={{ fontSize: '24px' }}>account_balance</span>
                    </div>
                    <div className="method-tile-label">Net Banking</div>
                    <div className="method-tile-sub">All Indian Banks</div>
                  </div>
                </div>

                {/* Step 2A: UPI FORM WITH STRICT VALIDATION */}
                {paymentMethod === 'upi' && (
                  <div className="gateway-panel">
                    <div className="panel-header-title">
                      <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                        qr_code_scanner
                      </span>
                      UPI ID (Virtual Payment Address)
                    </div>
                    <div className="panel-header-desc">
                      Enter your UPI VPA handle from Google Pay, PhonePe, Paytm or BHIM.
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="upiId">
                        UPI ID / VPA *
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required</span>
                      </label>
                      <div className="input-with-icon-wrap">
                        <span className="input-prefix-icon">
                          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>alternate_email</span>
                        </span>
                        <input
                          type="text"
                          id="upiId"
                          placeholder="e.g. yourname@okhdfcbank"
                          className={`gateway-input ${touched.upiId && errors.upiId ? 'input-error' : ''}`}
                          value={upiForm.upiId}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setUpiForm({ upiId: val });
                            if (touched.upiId) {
                              setErrors((prev) => ({ ...prev, upiId: validateField('upiId', val, 'upi') }));
                            }
                          }}
                          onBlur={() => handleBlur('upiId')}
                          disabled={processing}
                          autoComplete="off"
                        />
                      </div>
                      {touched.upiId && errors.upiId && (
                        <div className="form-error-msg">
                          <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                          {errors.upiId}
                        </div>
                      )}

                      {/* Quick handle helpers */}
                      <div className="upi-handles-chips">
                        <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>Quick Handles:</span>
                        {['@okhdfcbank', '@okaxis', '@paytm', '@ybl', '@upi'].map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            className="upi-chip"
                            onClick={() => {
                              const base = upiForm.upiId.includes('@')
                                ? upiForm.upiId.split('@')[0]
                                : upiForm.upiId;
                              const updated = (base || 'myaccount') + handle;
                              setUpiForm({ upiId: updated });
                              setTouched((prev) => ({ ...prev, upiId: true }));
                              setErrors((prev) => ({ ...prev, upiId: validateField('upiId', updated, 'upi') }));
                            }}
                          >
                            {handle}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      style={{ height: '46px', fontSize: '15px', fontWeight: '700' }}
                      onClick={handleProcessPayment}
                      disabled={processing}
                    >
                      {processing ? 'Connecting Gateway...' : `Verify & Pay ₹${currentPayable.toLocaleString()}`}
                    </button>
                  </div>
                )}

                {/* Step 2B: CARD FORM WITH LIVE VISUAL PREVIEW & STRICT VALIDATION */}
                {paymentMethod === 'card' && (
                  <div className="gateway-panel">
                    {/* Live Visual Card Mockup */}
                    <div className="interactive-card-mockup">
                      <div className="card-mockup-top">
                        <div className="card-chip-sim"></div>
                        <div className="card-brand-badge">{getCardBrand(cardForm.cardNumber)}</div>
                      </div>
                      <div className="card-mockup-number">
                        {cardForm.cardNumber || '•••• •••• •••• ••••'}
                      </div>
                      <div className="card-mockup-bottom">
                        <div>
                          <div style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px' }}>CARDHOLDER</div>
                          <div className="card-mockup-holder">{cardForm.cardHolder || 'FULL NAME'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px' }}>EXPIRES</div>
                          <div className="card-mockup-expiry">{cardForm.cardExpiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Number */}
                    <div className="form-field-group">
                      <label htmlFor="cardNumber">
                        16-Digit Card Number *
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Luhn Verified</span>
                      </label>
                      <div className="input-with-icon-wrap">
                        <span className="input-prefix-icon">
                          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>credit_card</span>
                        </span>
                        <input
                          type="text"
                          id="cardNumber"
                          inputMode="numeric"
                          placeholder="4123 4567 8901 2345"
                          className={`gateway-input ${touched.cardNumber && errors.cardNumber ? 'input-error' : ''}`}
                          value={cardForm.cardNumber}
                          onChange={handleCardNumberChange}
                          onBlur={() => handleBlur('cardNumber')}
                          disabled={processing}
                          maxLength={19}
                        />
                      </div>
                      {touched.cardNumber && errors.cardNumber && (
                        <div className="form-error-msg">
                          <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                          {errors.cardNumber}
                        </div>
                      )}
                    </div>

                    {/* Cardholder Name */}
                    <div className="form-field-group">
                      <label htmlFor="cardHolder">Name on Card *</label>
                      <div className="input-with-icon-wrap">
                        <span className="input-prefix-icon">
                          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>person</span>
                        </span>
                        <input
                          type="text"
                          id="cardHolder"
                          placeholder="e.g. Arun Kumar"
                          className={`gateway-input ${touched.cardHolder && errors.cardHolder ? 'input-error' : ''}`}
                          value={cardForm.cardHolder}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCardForm((prev) => ({ ...prev, cardHolder: val }));
                            if (touched.cardHolder) {
                              setErrors((prev) => ({ ...prev, cardHolder: validateField('cardHolder', val, 'card') }));
                            }
                          }}
                          onBlur={() => handleBlur('cardHolder')}
                          disabled={processing}
                        />
                      </div>
                      {touched.cardHolder && errors.cardHolder && (
                        <div className="form-error-msg">
                          <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                          {errors.cardHolder}
                        </div>
                      )}
                    </div>

                    {/* Expiry & CVV */}
                    <div className="form-row-2">
                      <div className="form-field-group">
                        <label htmlFor="cardExpiry">Valid Thru *</label>
                        <div className="input-with-icon-wrap">
                          <span className="input-prefix-icon">
                            <span className="material-icons-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
                          </span>
                          <input
                            type="text"
                            id="cardExpiry"
                            placeholder="MM/YY"
                            className={`gateway-input ${touched.cardExpiry && errors.cardExpiry ? 'input-error' : ''}`}
                            value={cardForm.cardExpiry}
                            onChange={handleExpiryChange}
                            onBlur={() => handleBlur('cardExpiry')}
                            disabled={processing}
                            maxLength={5}
                          />
                        </div>
                        {touched.cardExpiry && errors.cardExpiry && (
                          <div className="form-error-msg">
                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                            {errors.cardExpiry}
                          </div>
                        )}
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="cardCvv">CVV / CVC *</label>
                        <div className="input-with-icon-wrap">
                          <span className="input-prefix-icon">
                            <span className="material-icons-outlined" style={{ fontSize: '20px' }}>lock</span>
                          </span>
                          <input
                            type="password"
                            id="cardCvv"
                            placeholder="•••"
                            className={`gateway-input ${touched.cardCvv && errors.cardCvv ? 'input-error' : ''}`}
                            value={cardForm.cardCvv}
                            onChange={handleCvvChange}
                            onBlur={() => handleBlur('cardCvv')}
                            disabled={processing}
                            maxLength={4}
                          />
                        </div>
                        {touched.cardCvv && errors.cardCvv && (
                          <div className="form-error-msg">
                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                            {errors.cardCvv}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      style={{ height: '46px', fontSize: '15px', fontWeight: '700', marginTop: '10px' }}
                      onClick={handleProcessPayment}
                      disabled={processing}
                    >
                      {processing ? 'Processing Card...' : `Pay ₹${currentPayable.toLocaleString()} Securely`}
                    </button>
                  </div>
                )}

                {/* Step 2C: NET BANKING FORM WITH STRICT VALIDATION */}
                {paymentMethod === 'netbanking' && (
                  <div className="gateway-panel">
                    <div className="panel-header-title">
                      <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                        account_balance
                      </span>
                      Select Bank &amp; Customer Authentication
                    </div>
                    <div className="panel-header-desc">
                      Select your institutional bank to initiate online transfer.
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="bankSelect">Select Authorized Bank *</label>
                      <select
                        id="bankSelect"
                        className={`gateway-input no-icon ${touched.bank && errors.bank ? 'input-error' : ''}`}
                        value={netBankingForm.bank}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNetBankingForm((prev) => ({ ...prev, bank: val }));
                          if (touched.bank) {
                            setErrors((prev) => ({ ...prev, bank: validateField('bank', val, 'netbanking') }));
                          }
                        }}
                        onBlur={() => handleBlur('bank')}
                        disabled={processing}
                      >
                        <option value="">-- Choose Bank --</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Punjab National Bank">Punjab National Bank</option>
                      </select>
                      {touched.bank && errors.bank && (
                        <div className="form-error-msg">
                          <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                          {errors.bank}
                        </div>
                      )}
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="customerId">Net Banking User ID / Account Number *</label>
                      <div className="input-with-icon-wrap">
                        <span className="input-prefix-icon">
                          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>badge</span>
                        </span>
                        <input
                          type="text"
                          id="customerId"
                          placeholder="Enter your Customer ID or NetBanking username"
                          className={`gateway-input ${touched.customerId && errors.customerId ? 'input-error' : ''}`}
                          value={netBankingForm.customerId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNetBankingForm((prev) => ({ ...prev, customerId: val }));
                            if (touched.customerId) {
                              setErrors((prev) => ({ ...prev, customerId: validateField('customerId', val, 'netbanking') }));
                            }
                          }}
                          onBlur={() => handleBlur('customerId')}
                          disabled={processing}
                        />
                      </div>
                      {touched.customerId && errors.customerId && (
                        <div className="form-error-msg">
                          <span className="material-icons-outlined" style={{ fontSize: '15px' }}>error_outline</span>
                          {errors.customerId}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      style={{ height: '46px', fontSize: '15px', fontWeight: '700', marginTop: '10px' }}
                      onClick={handleProcessPayment}
                      disabled={processing}
                    >
                      {processing ? 'Redirecting...' : `Pay ₹${currentPayable.toLocaleString()} via Net Banking`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="payment-summary-card">
            <div className="summary-header">
              <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                receipt_long
              </span>
              Payment Overview
            </div>

            <div className="summary-item-row">
              <span>Billing Item</span>
              <span className="summary-item-val">Monthly Rent</span>
            </div>
            <div className="summary-item-row">
              <span>Property</span>
              <span className="summary-item-val">{activeBooking?.property?.name || 'Sunrise PG'}</span>
            </div>
            <div className="summary-item-row">
              <span>Room Number</span>
              <span className="summary-item-val">{activeBooking?.room || '101'}</span>
            </div>
            <div className="summary-item-row">
              <span>Cycle Due Date</span>
              <span className="summary-item-val">{rentDueDate}</span>
            </div>
            <div className="summary-item-row">
              <span>Gateway Convenience Fee</span>
              <span className="summary-item-val" style={{ color: 'var(--success)' }}>₹0 (FREE)</span>
            </div>

            <div className="summary-total-divider"></div>

            <div className="summary-total-row">
              <span>Total Payable</span>
              <span className="summary-total-price">₹{currentPayable.toLocaleString()}</span>
            </div>

            <div className="security-badge">
              <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>
                verified_user
              </span>
              <span>256-Bit SSL Encrypted Banking</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN PAYMENTS DASHBOARD VIEW
  return (
    <div className="payments-page">
      <div className="page-header page-header-row">
        <div>
          <h1>Payments</h1>
          <p>Manage your stay rent, track transactions and download receipts</p>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="stats-grid mb-20" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">
            Total Pending{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '28px', color: isPaidThisMonth ? 'var(--success)' : 'var(--warning)' }}>
                {isPaidThisMonth ? 'check_circle' : 'pending_actions'}
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: isPaidThisMonth ? 'var(--success)' : 'var(--warning)' }}>
            ₹{remainingPending.toLocaleString()}
          </div>
          {isPaidThisMonth && (
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
              ✓ All dues cleared for this month
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Paid this Month{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '28px', color: 'var(--success)' }}>
                verified
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            ₹{paidThisMonth.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Monthly Rent{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '28px' }}>
                payments
              </span>
            </span>
          </div>
          <div className="stat-value">₹{monthlyRent.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Next Rent Due{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '28px' }}>
                calendar_month
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '18px', paddingTop: '4px' }}>
            {rentDueDate}
          </div>
        </div>
      </div>

      {/* CONDITIONAL RENDER: IF HE PAYS, THE UPCOMING PAYMENT BILL CARD VANISHES! */}
      {isPaidThisMonth ? (
        <div className="card mb-20 payment-cleared-banner" style={{ marginBottom: '20px' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="cleared-icon-wrap">
                <span className="material-icons-outlined" style={{ fontSize: '30px' }}>verified</span>
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                  Rent Fully Paid for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}!
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                  No pending rent dues for this cycle. The upcoming payment bill has vanished. Next cycle commences on <strong>{rentDueDate}</strong>.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="badge badge-success" style={{ fontSize: '12px', padding: '6px 14px' }}>
                Cleared
              </span>
              {currentMonthPayments.length > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleViewReceipt(currentMonthPayments[0])}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '16px' }}>receipt</span>
                  View Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* UPCOMING PAYMENT BILL (VISIBLE ONLY WHEN RENT IS PENDING) */
        <div className="card mb-20" style={{ marginBottom: '20px' }}>
          <div className="card-body">
            <div className="card-title">Upcoming Payments</div>
            <div className="mt-14" style={{ marginTop: '14px' }}>
              <div className="payment-item">
                <div className="payment-info">
                  <div className="payment-type" style={{ fontWeight: '700', fontSize: '15px' }}>
                    Monthly Rent &bull; Room {activeBooking?.room || '101'}
                  </div>
                  <div className="payment-sub">
                    Due Date: <strong style={{ color: 'var(--text-primary)' }}>{rentDueDate}</strong> &bull; {activeBooking?.property?.name || 'Sunrise PG'}
                  </div>
                </div>
                <div className="payment-right" style={{ textAlign: 'right' }}>
                  <div className="payment-amount" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    ₹{remainingPending.toLocaleString()}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '6px', minWidth: '110px' }}
                    onClick={() => {
                      setErrors({});
                      setTouched({});
                      setIsPaying(true);
                    }}
                  >
                    Pay Now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORDED PAYMENT HISTORY */}
      <div className="card">
        <div className="card-body">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recorded Payment History</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {payments.length} Transaction{payments.length === 1 ? '' : 's'} recorded
            </span>
          </div>
          <div className="mt-14" style={{ marginTop: '14px', overflowX: 'auto' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading payment records...</p>
            ) : payments.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                No payment history recorded yet.
              </p>
            ) : (
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const isSuccess =
                      p.status === 'completed' || p.status === 'success' || p.status === 'verified';
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.transactionId || `TXN-${p.id}`}
                        </td>
                        <td style={{ fontWeight: 600 }}>Rent ({p.room ? `Rm ${p.room}` : 'Stay'})</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{Number(p.amount).toLocaleString()}
                        </td>
                        <td>{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                          {p.method}
                        </td>
                        <td>
                          <span
                            className={isSuccess ? 'badge badge-success' : 'badge badge-warning'}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                            onClick={() => handleViewReceipt(p)}
                            title="View or print receipt"
                          >
                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>
                              description
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL DIALOG */}
      {showReceiptModal && receiptData && (
        <div className="gateway-processing-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="payment-receipt-screen" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-success-badge">
              <span className="material-icons-outlined" style={{ fontSize: '38px' }}>check_circle</span>
            </div>

            <div className="receipt-header">
              <h2>Payment Recorded Successfully</h2>
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                RentBro PG Rental Management &bull; Official Digital Invoice
              </div>
              <div className="receipt-amount-display">
                ₹{Number(receiptData.amount).toLocaleString()}
              </div>
              <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 12px' }}>
                Payment Status: {receiptData.status}
              </span>
            </div>

            <table className="receipt-details-table">
              <tbody>
                <tr>
                  <td>Transaction Reference</td>
                  <td style={{ fontFamily: 'monospace' }}>{receiptData.transactionId}</td>
                </tr>
                <tr>
                  <td>Payment Date &amp; Time</td>
                  <td>{receiptData.date} &bull; {receiptData.time}</td>
                </tr>
                <tr>
                  <td>Tenant Name</td>
                  <td>{receiptData.tenantName}</td>
                </tr>
                <tr>
                  <td>Accommodation</td>
                  <td>{receiptData.propertyName} (Room {receiptData.room})</td>
                </tr>
                <tr>
                  <td>Payment Mode</td>
                  <td>{receiptData.method}</td>
                </tr>
                <tr>
                  <td>Purpose</td>
                  <td>Monthly PG Stay Rent</td>
                </tr>
              </tbody>
            </table>

            <div className="receipt-actions-row">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '17px' }}>print</span>
                Print / Save PDF
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowReceiptModal(false)}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
