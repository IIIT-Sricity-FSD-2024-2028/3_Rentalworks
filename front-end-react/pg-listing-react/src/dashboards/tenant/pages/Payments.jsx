import React, { useEffect, useMemo } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyRentDues,
  payRentDue,
  selectRentState,
  tenantPayments,
} from '../../../features/tenant/tenantSlices';
import { toastError, toastInfo } from '../../../features/ui/uiSlice';
import { useTenant } from '../hooks/useTenant';
import { loadPaymentConfig, selectPaymentMode } from '../../../features/booking/bookingSlice';
import RentLedger from '../components/RentLedger';
import ServiceUsageList from '../components/ServiceUsageList';
import useAutoRefresh from '../../../hooks/useAutoRefresh';
import { formatINR } from '../../../utils/normalize';
import './Payments.css';


const Payments = () => {
  const dispatch = useDispatch();
  const { tenant, activeBooking } = useTenant();
  const allPayments = useSelector(tenantPayments.selectors.selectItems);
  const paymentsLoading = useSelector(tenantPayments.selectors.selectIsLoading);
  const { dues, pendingCharges, status: rentStatus, error: rentError, paying: processing } = useSelector(selectRentState);
  const payments = useMemo(() => allPayments.filter((p) => Number(p.tenantId) === Number(tenant?.id)), [allPayments, tenant?.id]);
  const loading = paymentsLoading && payments.length === 0;
  const [isPaying, setIsPaying] = useScreenState(false);
  // 'razorpay' (real money) or 'test', reported by the server.
  const paymentMode = useSelector(selectPaymentMode);

  const [receiptSelection, setReceiptSelection] = useScreenState(null);
  const [selectedDueId, setSelectedDueId] = useScreenState(null);

  useEffect(() => {
    dispatch(loadPaymentConfig());
  }, [dispatch]);

  useEffect(() => {
    if (!tenant?.id) return;
    dispatch(tenantPayments.thunks.fetchAll(tenant.id));
    dispatch(fetchMyRentDues());
  }, [dispatch, tenant?.id]);
  useAutoRefresh(() => {
    if (tenant?.id && !processing && rentStatus !== 'loading') dispatch(fetchMyRentDues());
  }, 15000);

  // Determine current cycle and whether current month's rent has been paid
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRent = activeBooking ? Number(activeBooking.rent || 0) : 0;
  const roomLabel = activeBooking?.room
    ? `${activeBooking.room}${activeBooking.bedNumber ? ` / Bed ${activeBooking.bedNumber}` : ''}`
    : '—';

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

  const fmtDue = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const statusOf = (d) => d.effectiveStatus || d.status;
  const unpaidDues = dues
    .filter((d) => ['upcoming', 'due_soon', 'overdue'].includes(statusOf(d)))
    .sort((x, y) => String(x.dueDate).localeCompare(String(y.dueDate)));
  // The cycle being paid: the one picked in the ledger, else the earliest unpaid
  const pendingDue = selectedDueId == null ? unpaidDues[0] || null
    : unpaidDues.find((d) => d.id === selectedDueId) || null;
  const nextDue = unpaidDues[0] || null;
  // Only cycles that are actually owed now count as "pending"
  const owedNow = unpaidDues.filter((d) => ['due_soon', 'overdue'].includes(statusOf(d)));
  const remainingPending = owedNow.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const isPaidThisMonth = remainingPending === 0;
  const rentDueDate = nextDue ? fmtDue(nextDue.dueDate) : 'No upcoming dues';
  const bookingPayment = payments
    .filter((p) => (p.kind || 'booking') === 'booking' && ['completed', 'success', 'verified'].includes(p.status))
    .sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0))[0] || null;

  const handleLedgerPay = (due) => {
    setSelectedDueId(due.id);
    setIsPaying(true);
  };

  const handleLedgerReceipt = (due) => {
    const pay = due.payment || payments.find((p) => p.id === due.paymentId);
    if (pay) {
      handleViewReceipt(pay, due);
    } else {
      dispatch(toastInfo('Receipt is not available for this cycle yet.'));
    }
  };

  // Pay the selected due through the gateway (the server sets the amount)
  const handleProcessPayment = async (e) => {
    if (e) e.preventDefault();

    if (!activeBooking) {
      dispatch(toastError('No active stay or booking found to pay for.'));
      return;
    }

    if (!pendingDue) {
      dispatch(toastInfo('There is no rent due to pay right now.'));
      return;
    }
    // The amount comes from the ledger on the server, never from the browser.
    // The total shown (rent + service usage) is checked again by the server.
    const result = await dispatch(payRentDue({
      dueId: pendingDue.id,
      expectedAmount: Number(pendingDue.amount),
      description: `Rent ${fmtDue(pendingDue.periodStart)} – ${fmtDue(pendingDue.periodEnd)}`,
    }));
    if (payRentDue.rejected.match(result)) {
      dispatch(fetchMyRentDues());
      dispatch(toastError(result.payload || 'Payment failed. Please check your details and try again.'));
      return;
    }

    const payment = result.payload.result?.payment;
    if (payment?.id != null) setReceiptSelection({ paymentId: payment.id, dueId: pendingDue.id });
    setSelectedDueId(null);


    // The server adds the payment row and opens the next cycle.
    dispatch(tenantPayments.thunks.fetchAll(tenant.id));
    dispatch(fetchMyRentDues());
    setIsPaying(false);
  };

  // Select a server-confirmed payment and due from Redux by ID.
  const handleViewReceipt = (payment, due) => setReceiptSelection({
    paymentId: payment.id, dueId: due?.id ?? dues.find((entry) => String(entry.paymentId) === String(payment.id))?.id,
  });
  const due = receiptSelection?.dueId == null ? null : dues.find((entry) => entry.id === receiptSelection.dueId);
  const payment = payments.find((entry) => entry.id === receiptSelection?.paymentId) || (receiptSelection && due?.payment);
  const receiptDate = payment ? new Date(due?.paidAt || payment.createdAt || payment.paidDate) : null;
  const receiptData = payment ? {
    transactionId: payment.transactionId || `TXN-${payment.id}`,
    amount: Number(payment.amount),
    method: (payment.method || 'UPI').toUpperCase(),
    date: receiptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: receiptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    propertyName: payment.property?.name || activeBooking?.property?.name || '—',
    room: payment.room ? `${payment.room}${payment.bedNumber ? ` / Bed ${payment.bedNumber}` : ''}` : roomLabel,
    tenantName: tenant?.name || 'Tenant',
    status: ['completed', 'success', 'verified'].includes(payment.status) ? 'Completed' : payment.status,
    period: due ? `${fmtDue(due.periodStart)} – ${fmtDue(due.periodEnd)}` : '',
    rentAmount: payment.rentAmount != null ? Number(payment.rentAmount) : null,
    depositAmount: payment.depositAmount != null ? Number(payment.depositAmount) : null,
    feeAmount: payment.feeAmount != null ? Number(payment.feeAmount) : null,
    serviceCharges: due?.serviceCharges || [],
  } : null;

  // PAYMENT GATEWAY VIEW
  if (isPaying) {
    const currentPayable = pendingDue ? Number(pendingDue.amount) : 0;

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
            setSelectedDueId(null);
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
                <div className="card-title">Pay rent online</div>
                {paymentMode === 'test' && (
                  <div role="note" style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', borderRadius: 10, padding: '12px 14px', margin: '12px 0' }}>
                    <strong>Test mode — no real money is charged.</strong> Online payments are not connected yet, so this is recorded as a test payment.
                  </div>
                )}
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
                  {paymentMode === 'test'
                    ? 'Click Pay to record a test payment for this rent.'
                    : 'Click Pay to open the Razorpay window and pay by UPI, card or netbanking. Card details are entered with Razorpay and never reach RentBro.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  style={{ height: '46px', fontSize: '15px', fontWeight: '700' }}
                  onClick={handleProcessPayment}
                  disabled={processing || !pendingDue}
                >
                  {processing ? 'Waiting for payment...' : `${paymentMode === 'test' ? 'Record test payment' : 'Pay'} ₹${currentPayable.toLocaleString()}`}
                </button>
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
              <span className="summary-item-val">Rent and service usage</span>
            </div>
            <div className="summary-item-row">
              <span>Property</span>
              <span className="summary-item-val">{activeBooking?.property?.name || '—'}</span>
            </div>
            <div className="summary-item-row">
              <span>Room Number</span>
              <span className="summary-item-val">{roomLabel}</span>
            </div>
            <div className="summary-item-row">
              <span>Cycle Due Date</span>
              <span className="summary-item-val">{fmtDue(pendingDue?.dueDate)}</span>
            </div>
            {pendingDue ? (
              <>
                <div className="summary-item-row">
                  <span>Base Rent</span><strong>{formatINR(pendingDue.rentAmount ?? pendingDue.amount)}</strong>
                </div>
                {pendingDue.serviceCharges?.length > 0 && (
                  <>
                    <div className="summary-item-row">
                      <span>Service Usage</span><strong>{formatINR(pendingDue.serviceAmount)}</strong>
                    </div>
                    <ServiceUsageList charges={pendingDue.serviceCharges} formatDate={fmtDue} />
                  </>
                )}
              </>
            ) : <p role="status">This bill is no longer payable. Return to the ledger to view the latest status.</p>}
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
      <div className="payments-header-wrap">
        <div>
          <h1 className="payments-title">Payments</h1>
          <p className="payments-subtitle">
            Manage your stay rent, track transactions and download receipts
          </p>
        </div>
        <div className="payments-security-pill">
          <span className="material-icons-outlined" style={{ fontSize: '16px' }}>verified_user</span>
          <span>Encrypted PG Stay Billing</span>
        </div>
      </div>

      {/* TOP STATS OVERVIEW CARDS (4 EQUAL SPACIOUS COLUMNS) */}
      <div className="payment-stats-grid">
        <div className="payment-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Pending</span>
            <div className={`stat-card-icon ${isPaidThisMonth ? 'green' : 'amber'}`}>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                {isPaidThisMonth ? 'check_circle' : 'pending_actions'}
              </span>
            </div>
          </div>
          <div className={`stat-card-value ${isPaidThisMonth ? 'green' : 'amber'}`}>
            ₹{remainingPending.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            {isPaidThisMonth ? (
              <span className="stat-badge green">
                <span className="material-icons-outlined" style={{ fontSize: '13px' }}>done_all</span>
                All dues cleared
              </span>
            ) : (
              <span className="stat-badge amber">
                <span className="material-icons-outlined" style={{ fontSize: '13px' }}>schedule</span>
                Dues pending for this month
              </span>
            )}
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Paid this Month</span>
            <div className="stat-card-icon green">
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                verified
              </span>
            </div>
          </div>
          <div className="stat-card-value green">
            ₹{paidThisMonth.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge green">
              <span className="material-icons-outlined" style={{ fontSize: '13px' }}>check</span>
              Current Billing Cycle
            </span>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Monthly Rent</span>
            <div className="stat-card-icon blue">
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                payments
              </span>
            </div>
          </div>
          <div className="stat-card-value">
            ₹{monthlyRent.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge gray">
              Room {roomLabel} &bull; Base Rent
            </span>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Next Rent Due</span>
            <div className="stat-card-icon purple">
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                calendar_month
              </span>
            </div>
          </div>
          <div className="stat-card-value date-val" title={rentDueDate}>
            {rentDueDate}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge purple">
              <span className="material-icons-outlined" style={{ fontSize: '13px' }}>event</span>
              Upcoming Billing Date
            </span>
          </div>
        </div>
      </div>

      {bookingPayment && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div className="card-title">Paid at Booking</div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 10 }}>
              <div><div style={{ fontSize: 12, color: '#64748b' }}>Total paid</div><strong>₹{Number(bookingPayment.amount).toLocaleString('en-IN')}</strong></div>
              <div><div style={{ fontSize: 12, color: '#64748b' }}>Base rent</div><strong>₹{Number(bookingPayment.rentAmount ?? monthlyRent).toLocaleString('en-IN')}</strong></div>
              <div><div style={{ fontSize: 12, color: '#64748b' }}>Deposit &amp; maintenance</div><strong>₹{Math.max(0, Number(bookingPayment.amount) - Number(bookingPayment.rentAmount ?? monthlyRent)).toLocaleString('en-IN')}</strong></div>
            </div>
          </div>
        </div>
      )}

      {rentError && <p role="alert">{rentError}</p>}
      <RentLedger dues={dues} pendingCharges={pendingCharges} onPay={handleLedgerPay} onReceipt={handleLedgerReceipt} />

      {/* CONDITIONAL RENDER: IF HE PAYS, THE UPCOMING PAYMENT BILL CARD VANISHES! */}
      {isPaidThisMonth ? (
        <div className="payment-cleared-banner-card">
          <div className="banner-left">
            <div className="banner-icon-circle">
              <span className="material-icons-outlined">verified</span>
            </div>
            <div>
              <h3 className="banner-title">
                Rent Fully Paid for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}!
              </h3>
              <p className="banner-desc">
                {nextDue ? <>Your next rent bill is due <strong>{rentDueDate}</strong>. View its breakdown in the ledger.</> : 'There is no rent bill due right now.'}
              </p>
            </div>
          </div>
          <div className="banner-actions">
            <span className="banner-status-badge">
              <span className="material-icons-outlined" style={{ fontSize: '15px' }}>check_circle</span>
              Cleared
            </span>
            {currentMonthPayments.length > 0 && (
              <button
                type="button"
                className="btn-banner-receipt"
                onClick={() => handleViewReceipt(currentMonthPayments[0])}
              >
                <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#64748b' }}>receipt</span>
                <span>View Receipt</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* UPCOMING PAYMENT BILL (VISIBLE ONLY WHEN RENT IS PENDING) */
        <div className="upcoming-bill-card">
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
            Upcoming Payments
          </div>
          <div className="upcoming-bill-inner">
            <div className="payment-info">
              <div className="payment-type" style={{ fontWeight: '700', fontSize: '15.5px', color: '#0f172a' }}>
                Monthly Rent &bull; Room {roomLabel}
              </div>
              <div className="payment-sub" style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Due Date: <strong style={{ color: '#0f172a' }}>{rentDueDate}</strong> &bull; {activeBooking?.property?.name || '—'}
              </div>
            </div>
            <div className="payment-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="payment-amount" style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                {formatINR(nextDue?.amount)}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ minWidth: '120px', height: '40px', fontSize: '14px', fontWeight: '700' }}
                onClick={() => {
                  setSelectedDueId(nextDue?.id ?? null);
                  setIsPaying(true);
                }}
              >
                Pay Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-DATA PAYMENT HISTORY ANALYTICS & EXPENSE BREAKDOWN */}
      {(() => {
        const completedPayments = payments.filter((p) => {
          return p.status === 'completed' || p.status === 'success' || p.status === 'verified';
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartMonths = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mIdx = d.getMonth();
          const y = d.getFullYear();
          const mPayments = completedPayments.filter(p => {
            const pDate = new Date(p.paidDate || p.createdAt);
            return pDate.getMonth() === mIdx && pDate.getFullYear() === y;
          });
          const totalAmount = mPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
          chartMonths.push({
            label: monthNames[mIdx],
            year: y,
            total: totalAmount,
          });
        }
        const maxMonthAmount = Math.max(...chartMonths.map(m => m.total), 1);

        const paymentIds = new Set(completedPayments.map((entry) => String(entry.id)));
        const totalExpense = completedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const totalServicesPaid = dues.filter((entry) => entry.status === 'paid' && paymentIds.has(String(entry.paymentId)))
          .reduce((acc, entry) => acc + Number(entry.serviceAmount || 0), 0);
        const totalRentPaid = totalExpense - totalServicesPaid;

        const rentPct = totalExpense > 0 ? Math.round((totalRentPaid / totalExpense) * 100) : (totalRentPaid > 0 ? 100 : 0);
        const servPct = totalExpense > 0 ? 100 - rentPct : 0;

        return (
          <div className="payment-analytics-grid">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <span className="analytics-card-title">Payment History (Last 6 Months)</span>
                <span className="analytics-card-badge">Monthly Totals</span>
              </div>
              <div className="bar-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', minHeight: '140px', padding: '10px 0 0' }}>
                {chartMonths.map((m, idx) => {
                  const barHeight = m.total > 0 ? Math.max(22, Math.round((m.total / maxMonthAmount) * 110)) : 6;
                  return (
                    <div key={idx} className="bar-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: m.total > 0 ? '#0f172a' : '#94a3b8',
                          marginBottom: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.total > 0 ? `₹${(m.total / 1000).toFixed(m.total % 1000 === 0 ? 0 : 1)}k` : '₹0'}
                      </div>
                      <div
                        className="bar"
                        style={{
                          height: `${barHeight}px`,
                          width: '100%',
                          maxWidth: '42px',
                          background: m.total > 0 ? 'var(--primary, #c49a1a)' : '#e2e8f0',
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                        title={`${m.label} ${m.year}: ₹${m.total.toLocaleString()}`}
                      />
                      <div className="bar-label" style={{ fontSize: '12px', fontWeight: 600, marginTop: '8px', color: '#64748b' }}>
                        {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <span className="analytics-card-title">Expense Breakdown</span>
                <span className="analytics-card-badge">Total: ₹{totalExpense.toLocaleString()}</span>
              </div>
              {totalExpense === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No completed payments recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <div
                    className="pie-chart"
                    style={{
                      position: 'relative',
                      width: '116px',
                      height: '116px',
                      borderRadius: '50%',
                      background: servPct > 0
                        ? `conic-gradient(var(--primary, #c49a1a) 0% ${rentPct}%, #f59e0b ${rentPct}% 100%)`
                        : 'var(--primary, #c49a1a)',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="pie-center" style={{ position: 'absolute', inset: '22px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      100%
                    </div>
                  </div>
                  <div className="pie-legend" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '160px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary, #c49a1a)' }} />
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>Rent</span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rentPct}%</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', paddingLeft: '18px' }}>
                        ₹{totalRentPaid.toLocaleString()}
                      </div>
                    </div>
                    {servPct > 0 && (
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }} />
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Services</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{servPct}%</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', paddingLeft: '18px' }}>
                          ₹{totalServicesPaid.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* RECORDED PAYMENT HISTORY */}
      <div className="payment-history-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
              Recorded Payment History
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Official records of verified rent and stay transactions
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '5px 12px', borderRadius: '20px' }}>
            {payments.length} Transaction{payments.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-responsive-wrap">
          {loading ? (
            <p style={{ color: 'var(--text-muted)', padding: '24px' }}>Loading payment records...</p>
          ) : payments.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
              No payment history recorded yet.
            </p>
          ) : (
            <table className="payments-modern-table">
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
                      <td style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                        {p.transactionId || `TXN-${p.id}`}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        Rent ({p.room ? `Room ${p.room}` : 'Stay'})
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '14.5px' }}>
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td style={{ color: '#475569' }}>
                        {p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            color: '#334155',
                          }}
                        >
                          {p.method}
                        </span>
                      </td>
                      <td>
                        <span
                          className={isSuccess ? 'badge badge-success' : 'badge badge-warning'}
                          style={{ textTransform: 'capitalize', padding: '4px 10px' }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            fontSize: '12px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => handleViewReceipt(p)}
                          title="View or print official receipt"
                        >
                          <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                            description
                          </span>
                          <span>Receipt</span>
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

      {/* RECEIPT MODAL DIALOG */}
      {receiptData && (
        <div className="gateway-processing-overlay" onClick={() => setReceiptSelection(null)}>
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
                {receiptData.rentAmount != null && receiptData.depositAmount != null && (
                  <tr>
                    <td>Breakdown</td>
                    <td>Rent ₹{receiptData.rentAmount.toLocaleString('en-IN')} + Deposit ₹{receiptData.depositAmount.toLocaleString('en-IN')}{receiptData.feeAmount ? ` + Fees ₹${receiptData.feeAmount.toLocaleString('en-IN')}` : ''}</td>
                  </tr>
                )}
                {receiptData.serviceCharges.length > 0 && (
                  <tr>
                    <td>Service Usage</td>
                    <td><ServiceUsageList charges={receiptData.serviceCharges} formatDate={fmtDue} /></td>
                  </tr>
                )}
                <tr>
                  <td>Payment Mode</td>
                  <td>{receiptData.method}</td>
                </tr>
                <tr>
                  <td>Purpose</td>
                  <td>{receiptData.period ? `Rent for ${receiptData.period}` : 'Monthly PG Stay Rent'}</td>
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
                onClick={() => setReceiptSelection(null)}
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
