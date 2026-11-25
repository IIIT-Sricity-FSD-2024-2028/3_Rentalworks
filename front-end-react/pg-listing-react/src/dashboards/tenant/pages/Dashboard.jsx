import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyRentDues,
  selectAmountDue,
  selectNextDue,
  tenantComplaints,
  tenantIssues,
  tenantPayments,
  tenantServiceRequests,
} from '../../../features/tenant/tenantSlices';
import { useTenant } from '../hooks/useTenant';
import { StatusBadge } from '../components';

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'plumbing':
      return 'water_drop';
    case 'electrical':
      return 'bolt';
    case 'appliances':
      return 'kitchen';
    case 'internet/wifi':
    case 'internet':
    case 'wifi':
      return 'wifi';
    case 'maintenance':
      return 'build';
    default:
      return 'report_problem';
  }
};

const PAID = ['completed', 'success', 'verified'];
const isOpen = (x) => ['open', 'in_progress', 'in-progress'].includes(x.status);

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { tenant, activeBooking, loading } = useTenant();

  const complaints = useSelector(tenantComplaints.selectors.selectItems);
  const issues = useSelector(tenantIssues.selectors.selectItems);
  const payments = useSelector(tenantPayments.selectors.selectItems);
  const tenantServicesList = useSelector(tenantServiceRequests.selectors.selectItems);
  const issuesLoading = useSelector(tenantIssues.selectors.selectIsLoading);
  const complaintsLoading = useSelector(tenantComplaints.selectors.selectIsLoading);
  const paymentsDue = useSelector(selectAmountDue);
  // Next unpaid cycle from the rent ledger (earliest first)
  const nextDue = useSelector(selectNextDue);

  useEffect(() => {
    if (!tenant?.id) return;
    dispatch(tenantComplaints.thunks.fetchAll());
    dispatch(tenantIssues.thunks.fetchAll());
    dispatch(tenantServiceRequests.thunks.fetchAll());
    dispatch(tenantPayments.thunks.fetchAll(tenant.id));
    dispatch(fetchMyRentDues());
  }, [dispatch, tenant?.id]);

  const recentIssues = issues.slice(0, 3);
  const recentComplaints = complaints.slice(0, 3);
  const loadingItems = (issuesLoading && !issues.length) || (complaintsLoading && !complaints.length);
  const complaintsCount = complaints.filter(isOpen).length + issues.filter(isOpen).length;
  const pendingServicesCount = tenantServicesList.filter((s) => ['pending', 'in_progress', 'scheduled'].includes(s.status)).length;
  const tenantCompletedPayments = payments.filter((p) => Number(p.tenantId) === Number(tenant?.id) && PAID.includes(p.status));

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading your dashboard...</div>;
  }

  const fmt = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const propertyName = activeBooking?.property?.name || '—';
  const room = activeBooking?.room
    ? `Room ${activeBooking.room}${activeBooking.bedNumber ? ` • Bed ${activeBooking.bedNumber}` : ''}`
    : '—';
  const checkIn = fmt(activeBooking?.checkIn);
  const rent = Number(activeBooking?.rent || 0);

  let checkOutDate = '—';
  let daysRemaining = null;
  if (activeBooking?.checkIn && parseInt(activeBooking.duration, 10) > 0) {
    const out = new Date(activeBooking.checkIn);
    out.setMonth(out.getMonth() + parseInt(activeBooking.duration, 10));
    checkOutDate = fmt(out);
    daysRemaining = Math.max(0, Math.ceil((out.getTime() - Date.now()) / 86400000));
  }

  const rentDueDate = nextDue ? fmt(nextDue.dueDate) : '—';
  const nextStatus = nextDue ? (nextDue.effectiveStatus || nextDue.status) : null;
  const countdown = nextDue && typeof nextDue.daysUntilDue === 'number'
    ? (nextDue.daysUntilDue < 0
        ? `${Math.abs(nextDue.daysUntilDue)} day(s) overdue`
        : nextDue.daysUntilDue === 0 ? 'Due today' : `Due in ${nextDue.daysUntilDue} day(s)`)
    : '';
  const bookingPayment = [...tenantCompletedPayments]
    .filter(p => (p.kind || 'booking') === 'booking')
    .sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0))[0] || null;
  const bpTotal = Number(bookingPayment?.amount || 0);
  const bpRent = Number(bookingPayment?.rentAmount ?? rent);
  const bpDeposit = Math.max(0, bpTotal - bpRent);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your stay and activities</p>
      </div>

      <div className="stay-banner">
        <h3><span className="material-icons-outlined" style={{fontSize: '24px'}}>home</span> Your Stay Information</h3>
        <div className="stay-grid">
          <div className="stay-item"><div className="stay-label">Property Name</div><div className="stay-value">{propertyName}</div></div>
          <div className="stay-item"><div className="stay-label">Room &amp; Bed</div><div className="stay-value">{room}</div></div>
          <div className="stay-item"><div className="stay-label">Check-in Date</div><div className="stay-value">{checkIn}</div></div>
          <div className="stay-item"><div className="stay-label">Check-out Date</div><div className="stay-value">{checkOutDate}</div></div>
          <div className="stay-item"><div className="stay-label">Rent Due Date</div><div className="stay-value">{rentDueDate}</div></div>
          <div className="stay-item"><div className="stay-label">Monthly Rent</div><div className="stay-value">₹{Number(rent).toLocaleString()}</div></div>
          <div className="stay-item">
            <div className="stay-label">Utilities Included</div>
            <div className="utility-icons">
              <span className="utility-icon" title="Electricity"><span className="material-icons-outlined" style={{fontSize: '20px'}}>bolt</span></span>
              <span className="utility-icon" title="Water Supply">💧</span>
              <span className="utility-icon" title="High-Speed Wi-Fi"><span className="material-icons-outlined" style={{fontSize: '20px'}}>wifi</span></span>
            </div>
          </div>
        </div>
      </div>

      {nextDue && (
        <div className="payment-reminder" style={{ marginBottom: 16, borderLeft: `4px solid ${nextStatus === 'overdue' ? '#dc2626' : nextStatus === 'due_soon' ? '#f59e0b' : '#16a34a'}` }}>
          <div className="reminder-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>event</span></div>
          <div className="reminder-text">
            <strong>Next Rent Due:</strong> ₹{Number(nextDue.amount || 0).toLocaleString()} on <strong>{rentDueDate}</strong>
            {countdown ? <> — <strong>{countdown}</strong></> : null}
          </div>
          <div className="reminder-actions">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/tenant/payments')}>
              {nextStatus === 'upcoming' ? 'View Ledger' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}

      {bookingPayment && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="card-title">Paid at Booking</div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 10 }}>
              <div><div className="stay-label">Total paid</div><strong>₹{bpTotal.toLocaleString('en-IN')}</strong></div>
              <div><div className="stay-label">First month rent</div><strong>₹{bpRent.toLocaleString('en-IN')}</strong></div>
              <div><div className="stay-label">Deposit &amp; maintenance</div><strong>₹{bpDeposit.toLocaleString('en-IN')}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div 
          className="stat-card" 
          onClick={() => navigate('/dashboard/tenant/issues')} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          title="Click to view all Issues"
        >
          <div className="stat-label">Active Issues / Complaints <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span></div>
          <div className="stat-value">{complaintsCount}</div>
          <div className="stat-sub">Needs attention • Click to view</div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => navigate('/dashboard/tenant/services')} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          title="Click to view Services"
        >
          <div className="stat-label">Pending Services <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span></div>
          <div className="stat-value">{pendingServicesCount}</div>
          <div className="stat-sub">In progress</div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => navigate('/dashboard/tenant/payments')} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          title="Click to view Payments"
        >
          <div className="stat-label">Payment Due <span className="stat-icon">₹</span></div>
          <div className="stat-value" style={{color: paymentsDue > 0 ? 'var(--primary)' : 'var(--success)'}}>
            ₹{Number(paymentsDue).toLocaleString()}
          </div>
          <div className="stat-sub" style={{color: paymentsDue > 0 ? 'var(--danger)' : 'var(--success)'}}>
            {paymentsDue > 0 ? 'Action Required' : 'Rent Cleared ✓'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Days Remaining <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>calendar_today</span></span></div>
          <div className="stat-value">{daysRemaining ?? '—'}</div>
          <div className="stat-sub">Until check-out</div>
        </div>
      </div>

      {/* DEDICATED ISSUES & COMPLAINTS SECTION ON DASHBOARD */}
      <div className="grid-2 mb-20" style={{ marginBottom: '20px' }}>
        {/* RECENT ISSUES CARD */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="card-title" style={{ margin: 0 }}>Recent Issues</div>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => navigate('/dashboard/tenant/issues')}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                View All →
              </button>
            </div>

            {loadingItems ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span className="material-icons-outlined" style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>sync</span>
                <p style={{ marginTop: '6px' }}>Loading issues...</p>
              </div>
            ) : recentIssues.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-icons-outlined" style={{ fontSize: '32px', opacity: 0.6 }}>build_circle</span>
                <p style={{ marginTop: '8px', fontSize: '13px' }}>No issues reported.</p>
                <button 
                  className="btn btn-outline btn-sm mt-10" 
                  onClick={() => navigate('/dashboard/tenant/issues')}
                  style={{ marginTop: '10px', fontSize: '12px' }}
                >
                  + Report Issue
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentIssues.map((iss) => (
                  <div 
                    key={iss.id} 
                    onClick={() => navigate('/dashboard/tenant/issues')}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-secondary, #f8fafc)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color, #e2e8f0)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                          {getCategoryIcon(iss.category)}
                        </span>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{iss.title}</strong>
                      </div>
                      <StatusBadge status={(iss.status || 'open').replace('-', '_')} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {iss.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{iss.location || (iss.roomEntity?.roomNumber ? `Room ${iss.roomEntity.roomNumber}` : 'Room 101')}</span>
                      <span>{iss.createdAt ? new Date(iss.createdAt).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT COMPLAINTS CARD */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="card-title" style={{ margin: 0 }}>Recent Complaints</div>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => navigate('/dashboard/tenant/complaints')}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                View All →
              </button>
            </div>

            {loadingItems ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span className="material-icons-outlined" style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>sync</span>
                <p style={{ marginTop: '6px' }}>Loading complaints...</p>
              </div>
            ) : recentComplaints.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-icons-outlined" style={{ fontSize: '32px', opacity: 0.6 }}>chat</span>
                <p style={{ marginTop: '8px', fontSize: '13px' }}>No complaints filed.</p>
                <button 
                  className="btn btn-outline btn-sm mt-10" 
                  onClick={() => navigate('/dashboard/tenant/complaints')}
                  style={{ marginTop: '10px', fontSize: '12px' }}
                >
                  + File Complaint
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentComplaints.map((c) => {
                  const normStat = (c.status || 'open').replace('-', '_');
                  const displayTitle = c.title || c.description?.split(' - ')?.[0] || 'General Complaint';
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => navigate('/dashboard/tenant/complaints')}
                      style={{ 
                        padding: '12px', 
                        background: 'var(--bg-secondary, #f8fafc)', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color, #e2e8f0)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                            chat
                          </span>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{displayTitle}</strong>
                        </div>
                        <StatusBadge status={normStat} />
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>#CMP-{c.id}</span>
                        <span>{c.reportedAt || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REAL-DATA PAYMENT HISTORY HISTOGRAM & EXPENSE BREAKDOWN */}
      {(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartMonths = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mIdx = d.getMonth();
          const y = d.getFullYear();
          const mPayments = tenantCompletedPayments.filter(p => {
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

        const totalRentPaid = tenantCompletedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const completedServices = tenantServicesList.filter(s => s.status === 'completed');
        const totalServicesPaid = completedServices.reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const totalExpense = totalRentPaid + totalServicesPaid;

        const rentPct = totalExpense > 0 ? Math.round((totalRentPaid / totalExpense) * 100) : 100;
        const servPct = totalExpense > 0 ? 100 - rentPct : 0;

        return (
          <div className="grid-2 mb-20" style={{ marginBottom: '20px' }}>
            <div className="card">
              <div className="card-body">
                <div className="card-title">Payment History</div>
                <div className="bar-chart mt-14" style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-end', gap: '16px', minHeight: '130px' }}>
                  {chartMonths.map((m, idx) => {
                    const barHeight = m.total > 0 ? Math.max(18, Math.round((m.total / maxMonthAmount) * 110)) : 6;
                    return (
                      <div key={idx} className="bar-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                          className="bar"
                          style={{
                            height: `${barHeight}px`,
                            width: '100%',
                            maxWidth: '38px',
                            background: m.total > 0 ? 'var(--primary)' : '#e2e8f0',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.4s ease',
                          }}
                          title={`${m.label} ${m.year}: ₹${m.total.toLocaleString()}`}
                        />
                        <div className="bar-label" style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="card-title">Expense Breakdown</div>
                {totalExpense === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No completed payments recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '14px' }}>
                    <div
                      className="pie-chart"
                      style={{
                        position: 'relative',
                        width: '110px',
                        height: '110px',
                        borderRadius: '50%',
                        background: servPct > 0
                          ? `conic-gradient(var(--primary) 0% ${rentPct}%, #f59e0b ${rentPct}% 100%)`
                          : 'var(--primary)',
                        flexShrink: 0,
                      }}
                    >
                      <div className="pie-center" style={{ position: 'absolute', inset: '18px', background: 'white', borderRadius: '50%' }} />
                    </div>
                    <div className="pie-legend" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div className="pie-legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pie-dot" style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)', flexShrink: 0 }} />
                        <strong>Rent</strong> {rentPct}% (₹{totalRentPaid.toLocaleString()})
                      </div>
                      {servPct > 0 && (
                        <div className="pie-legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pie-dot" style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', flexShrink: 0 }} />
                          <strong>Services</strong> {servPct}% (₹{totalServicesPaid.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Dashboard;
