import React, { useMemo } from 'react';
import useScreenState from '../app/useScreenState';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { selectIssuedPassword, selectLastConfirmed } from '../features/booking/bookingSlice';
import './BookingConfirmed.css';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (value) => {
  const d = value ? new Date(value) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${safe.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${safe.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Builds the receipt from the Redux booking slice only - no network call, so it can never hang. */
function buildReceipt(record, fallbackUser) {
  const payment = record.payment || {};
  const tenant = record.tenant || fallbackUser || {};
  const total = Number(payment.amount || 0);
  const rent = Number(payment.rentAmount ?? record.rent ?? 0);
  const deposit = payment.depositAmount != null ? Number(payment.depositAmount) : null;
  const fee = payment.feeAmount != null ? Number(payment.feeAmount) : null;
  // "Security deposit & maintenance" is everything that is not the first month's rent.
  const depositAndFees = Math.max(0, total - rent);
  const rawStatus = String(payment.status || '').toLowerCase();

  return {
    receiptId: payment.transactionId || record.bookingCode || '—',
    bookingCode: record.bookingCode || (record.id ? `BK-${String(record.id).padStart(5, '0')}` : '—'),
    tenantName: tenant.name || '—',
    tenantPhone: tenant.phone || '—',
    propertyName: record.property || '—',
    room: record.room || '—',
    bed: record.bedNumber || tenant.bedNumber || null,
    roomType: record.roomType || '',
    checkIn: record.checkIn,
    rent,
    deposit,
    fee,
    depositAndFees,
    total,
    method: String(payment.method || '—').toUpperCase(),
    status: rawStatus === 'verified' || rawStatus === 'completed' || !rawStatus ? 'PAID' : rawStatus.toUpperCase(),
    paidAt: payment.paidAt || record.createdAt,
  };
}

function receiptHtml(r) {
  const row = (k, v) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(r.receiptId)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:32px}
  h1{margin:0 0 4px;font-size:22px} .muted{color:#64748b;font-size:13px}
  .badge{display:inline-block;background:#dcfce7;color:#15803d;font-weight:700;padding:4px 12px;border-radius:99px;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:18px} td{padding:9px 4px;border-bottom:1px solid #e2e8f0;font-size:14px}
  .total td{font-weight:800;font-size:16px;border-top:2px solid #0f172a;border-bottom:none}
  .sub td{color:#64748b;font-size:12px;padding-left:18px}
</style></head><body>
<h1>RentBro &mdash; Booking Receipt</h1>
<div class="muted">Receipt / Transaction ID: <b>${escapeHtml(r.receiptId)}</b> &bull; Booking ${escapeHtml(r.bookingCode)}</div>
<p><span class="badge">${escapeHtml(r.status)}</span> <span class="muted">${escapeHtml(fmtDateTime(r.paidAt))}</span></p>
<table>
${row('Tenant', escapeHtml(r.tenantName))}
${row('Phone', escapeHtml(r.tenantPhone))}
${row('PG', escapeHtml(r.propertyName))}
${row('Room / Bed', escapeHtml(`Room #${r.room}${r.bed ? ` / Bed ${r.bed}` : ''}`))}
${row('Move-in date', escapeHtml(fmtDate(r.checkIn)))}
${row('Payment method', escapeHtml(r.method))}
${row('First month rent', escapeHtml(money(r.rent)))}
${row('Security deposit &amp; maintenance', escapeHtml(money(r.depositAndFees)))}
${r.deposit != null ? `<tr class="sub"><td>Security deposit</td><td style="text-align:right">${escapeHtml(money(r.deposit))}</td></tr>` : ''}
${r.fee ? `<tr class="sub"><td>Platform / maintenance fee</td><td style="text-align:right">${escapeHtml(money(r.fee))}</td></tr>` : ''}
<tr class="total"><td>Total paid</td><td style="text-align:right">${escapeHtml(money(r.total))}</td></tr>
</table>
<p class="muted" style="margin-top:28px">This is a computer-generated receipt and does not need a signature.</p>
</body></html>`;
}

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const confirmed = useSelector(selectLastConfirmed);
  // Hook order: read the issued password before any early return.
  const issuedPassword = useSelector((state) => selectIssuedPassword(state, state.booking.lastConfirmed?.booking?.id));

  const [copied, setCopied] = useScreenState(false);
  const [showPassword, setShowPassword] = useScreenState(true);
  const [showReceipt, setShowReceipt] = useScreenState(false);

  const record = useMemo(
    () =>
      confirmed?.booking
        ? {
            ...confirmed.booking,
            payment: confirmed.payment,
            tenant: confirmed.tenant,
            credentials: confirmed.credentials,
            createdAt: confirmed.confirmedAt,
          }
        : null,
    [confirmed],
  );
  const forFriend = confirmed?.bookingFor === 'friend';
  const credentials = record?.credentials || {};
  const tenant = record?.tenant || currentUser || {};
  const receipt = useMemo(() => (record ? buildReceipt(record, currentUser) : null), [record, currentUser]);

  if (!record || !receipt) {
    return (
      <div className="confirmed-page-container">
        <div className="confirmed-card" style={{ textAlign: 'center' }}>
          <span className="material-icons-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>receipt_long</span>
          <h1>No recent booking found</h1>
          <p>Complete a booking to see your confirmation, credentials and receipt here.</p>
          <div className="confirmed-actions-row" style={{ justifyContent: 'center' }}>
            <button className="btn-view-bookings-action" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
            <button className="btn-tenant-portal-action" onClick={() => navigate('/listings')}>Browse PGs</button>
          </div>
        </div>
      </div>
    );
  }

  const password = issuedPassword;
  const hasPassword = Boolean(password);
  const allotment = `Room #${receipt.room}${receipt.bed ? ` • Bed ${receipt.bed}` : ''}`;

  const handleCopyCredentials = async () => {
    const lines = [`Tenant ID: ${credentials.username || tenant.username || ''}`];
    lines.push(hasPassword ? `Temporary password: ${password}` : 'Password: same as your guest account password');
    lines.push(`Login: ${window.location.origin}/login`);
    const ok = await copyText(lines.join('\n'));
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReceipt = () => {
    // Render the receipt into a hidden iframe and print it: "Save as PDF" in the print dialog gives a PDF.
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(receiptHtml(receipt));
    doc.close();
    setTimeout(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } finally {
        setTimeout(() => frame.parentNode && frame.parentNode.removeChild(frame), 1000);
      }
    }, 300);
  };

  return (
    <div className="confirmed-page-container">
      <div className="confirmed-card">
        <div className="confirmed-badge-circle">
          <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#15803d' }}>check_circle</span>
        </div>

        <div className="confirmed-title-wrap">
          <span className="pill-confirmed">Paid · Bed booked</span>
          <h1>Congratulations, Your Booking is Confirmed!</h1>
          <p>
            {forFriend ? 'The' : 'Your'} bed at <strong>{receipt.propertyName}</strong> is reserved for <strong>{receipt.tenantName}</strong>.
            {' '}
            A new Tenant ID was created for this PG. Sign in with it to open this PG's tenant dashboard.
          </p>
        </div>

        <div className="confirmed-tiles-grid">
          <div className="c-tile">
            <span className="c-label">Booking ID</span>
            <strong className="c-val">{receipt.bookingCode}</strong>
          </div>
          <div className="c-tile">
            <span className="c-label">Transaction ID</span>
            <strong className="c-val">{receipt.receiptId}</strong>
          </div>
          <div className="c-tile">
            <span className="c-label">Allotted Room &amp; Bed</span>
            <strong className="c-val" style={{ color: '#ca8a04' }}>{allotment}</strong>
          </div>
          <div className="c-tile">
            <span className="c-label">Move-in Date</span>
            <strong className="c-val">{fmtDate(receipt.checkIn)}</strong>
          </div>
          <div className="c-tile">
            <span className="c-label">Total Paid</span>
            <strong className="c-val">{money(receipt.total)}</strong>
          </div>
        </div>

        {/* YOUR ACCOUNT CREDENTIALS */}
        <div className="tenant-credentials-card">
          <div className="cred-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-icons-outlined" style={{ color: '#ca8a04', fontSize: '28px' }}>badge</span>
              <div>
                <h3>{forFriend ? 'Your Friend’s Account Credentials' : 'Your Account Credentials'}</h3>
                <p>{forFriend ? 'Share these so they can sign in to their Tenant Dashboard' : `Sign in with this Tenant ID to open the ${receipt.propertyName} tenant dashboard`}</p>
              </div>
            </div>
            <span className="cred-status-tag">Status: Active Tenant</span>
          </div>

          <div className="cred-fields-grid">
            <div className="cred-item">
              <span className="cred-label">Tenant ID (username):</span>
              <code className="cred-code" data-testid="tenant-id">{credentials.username || tenant.username || '—'}</code>
            </div>

            <div className="cred-item">
              <span className="cred-label">Registered Email:</span>
              <code className="cred-code">{credentials.email || tenant.email || '—'}</code>
            </div>

            <div className="cred-item full-width">
              <span className="cred-label">{hasPassword ? 'Temporary Password:' : 'Password:'}</span>
              {hasPassword ? (
                <div className="password-display-box">
                  <code className="cred-code password-val" data-testid="tenant-password">
                    {showPassword ? password : '•'.repeat(password.length)}
                  </code>
                  <button type="button" className="btn-copy-cred" onClick={() => setShowPassword((v) => !v)}>
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              ) : (
                <code className="cred-code">Same as your guest account password</code>
              )}
            </div>
          </div>

          <div className="cred-actions">
            <button type="button" className="btn-copy-cred strong" onClick={handleCopyCredentials}>
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>content_copy</span>
              {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Copy failed — select & copy manually' : 'Copy Credentials'}
            </button>
          </div>

          <div className="cred-notice-footer">
            <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>check</span>
            <span>
              {hasPassword
                ? 'Save these now: the password is shown only on this page. Sign in with the Tenant ID to open the tenant dashboard.'
                : 'Sign out and sign in with this Tenant ID and your guest account password to open the tenant dashboard. Your guest account only shows booking history and is used to book other PGs.'}{' '}
              Your warden has been notified of your room and bed.
            </span>
          </div>
        </div>

        <div className="confirmed-actions-row">
          <button className="btn-view-bookings-action" onClick={() => setShowReceipt(true)}>
            <span className="material-icons-outlined">receipt_long</span>
            View My Booking Receipt
          </button>
          <button className="btn-print-receipt" onClick={handleDownloadReceipt}>
            <span className="material-icons-outlined">download</span>
            Download Receipt
          </button>
          <button className="btn-view-bookings-action" onClick={() => navigate('/my-bookings')}>
            <span className="material-icons-outlined">event_available</span>
            View My Bookings
          </button>
        </div>
      </div>

      {showReceipt && (
        <div className="rcpt-overlay" role="dialog" aria-modal="true" aria-label="Booking receipt" onClick={() => setShowReceipt(false)}>
          <div className="rcpt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rcpt-head">
              <div>
                <h2>Booking Receipt</h2>
                <div className="rcpt-muted">Receipt / Transaction ID: <b>{receipt.receiptId}</b></div>
              </div>
              <span className="rcpt-paid">{receipt.status}</span>
            </div>

            <table className="rcpt-table">
              <tbody>
                <tr><td>Tenant</td><td>{receipt.tenantName}</td></tr>
                <tr><td>Phone</td><td>{receipt.tenantPhone}</td></tr>
                <tr><td>PG</td><td>{receipt.propertyName}</td></tr>
                <tr><td>Room / Bed</td><td>{allotment}</td></tr>
                <tr><td>Payment method</td><td>{receipt.method}</td></tr>
                <tr><td>Paid on</td><td>{fmtDateTime(receipt.paidAt)}</td></tr>
              </tbody>
            </table>

            <table className="rcpt-table rcpt-breakdown">
              <tbody>
                <tr><td>First month rent</td><td>{money(receipt.rent)}</td></tr>
                <tr><td>Security deposit &amp; maintenance</td><td>{money(receipt.depositAndFees)}</td></tr>
                {receipt.deposit != null && <tr className="rcpt-sub"><td>Security deposit</td><td>{money(receipt.deposit)}</td></tr>}
                {receipt.fee ? <tr className="rcpt-sub"><td>Platform / maintenance fee</td><td>{money(receipt.fee)}</td></tr> : null}
                <tr className="rcpt-total"><td>Total paid</td><td>{money(receipt.total)}</td></tr>
              </tbody>
            </table>

            <div className="rcpt-actions">
              <button type="button" className="btn-print-receipt" onClick={handleDownloadReceipt}>
                <span className="material-icons-outlined">download</span>
                Download / Print PDF
              </button>
              <button type="button" className="btn-view-bookings-action" onClick={() => setShowReceipt(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
