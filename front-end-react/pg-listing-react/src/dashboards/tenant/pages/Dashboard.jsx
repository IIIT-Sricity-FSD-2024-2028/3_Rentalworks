import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { tenant, activeBooking, loading } = useAuth();
  
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [paymentsDue, setPaymentsDue] = useState(0);
  const [pendingServicesCount, setPendingServicesCount] = useState(0);
  const [recentIssues, setRecentIssues] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    // Animate bars
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => {
      setTimeout(() => {
        bar.style.height = bar.dataset.height + 'px';
      }, 100);
    });
  }, []);

  useEffect(() => {
    // Fetch stats and lists
    const fetchStats = async () => {
      try {
        if (!tenant) return;
        setLoadingItems(true);
        
        // Fetch complaints & issues
        const [allComplaints, myIssues, allPayments, myServiceRequests] = await Promise.all([
          apiFetch(`/complaints/my?tenantId=${tenant.id}`).catch(() => 
            apiFetch(`/complaints?tenantId=${tenant.id}`).catch(() => [])
          ),
          apiFetch(`/issues/my?tenantId=${tenant.id}`).catch(() => []),
          apiFetch('/payments').catch(() => []),
          apiFetch('/service-requests/my').catch(() => []),
        ]);

        const userComplaints = (Array.isArray(allComplaints) ? allComplaints : []).filter(
          c => Number(c.tenantId) === Number(tenant.id)
        );
        const userIssues = Array.isArray(myIssues) ? myIssues : [];

        // Save recent items for dashboard display (latest 3 of each)
        setRecentIssues(userIssues.slice(0, 3));
        setRecentComplaints(userComplaints.slice(0, 3));

        const activeComplaints = userComplaints.filter(
          c => c.status === 'open' || c.status === 'in_progress' || c.status === 'in-progress'
        );
        const openIssues = userIssues.filter(
          i => i.status === 'open' || i.status === 'in_progress' || i.status === 'in-progress'
        );
        setComplaintsCount(activeComplaints.length + openIssues.length);
        
        // Fetch payments
        const curM = new Date().getMonth();
        const curY = new Date().getFullYear();
        const userCompletedThisMonth = (Array.isArray(allPayments) ? allPayments : []).filter(
          p => Number(p.tenantId) === Number(tenant.id) && 
          (p.status === 'completed' || p.status === 'success' || p.status === 'verified') &&
          new Date(p.paidDate || p.createdAt).getMonth() === curM &&
          new Date(p.paidDate || p.createdAt).getFullYear() === curY
        );
        const monthlyRentVal = activeBooking ? Number(activeBooking.rent || 0) : 0;
        const paidSoFar = userCompletedThisMonth.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const remainingDue = monthlyRentVal > 0 ? Math.max(0, monthlyRentVal - paidSoFar) : 0;
        setPaymentsDue(remainingDue);

        // Service requests
        const activeServices = (Array.isArray(myServiceRequests) ? myServiceRequests : []).filter(
          s => s.status === 'pending' || s.status === 'in_progress' || s.status === 'scheduled'
        );
        setPendingServicesCount(activeServices.length);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoadingItems(false);
      }
    };
    
    fetchStats();
  }, [tenant]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading your dashboard...</div>;
  }

  const propertyName = activeBooking?.property?.name || 'Sunrise PG Residency';
  const room = activeBooking?.room || '101';
  const checkIn = activeBooking?.checkIn || 'Oct 19, 2026';
  const rent = activeBooking?.rent || 8500;
  const status = activeBooking?.status || 'active';
  
  // Calculate checkout and rent due date dynamically based on booking
  let checkOutDate = 'Apr 19, 2027';
  let rentDueDate = 'Nov 10, 2026';
  
  if (activeBooking && activeBooking.checkIn) {
    const checkInDateObj = new Date(activeBooking.checkIn);
    if (activeBooking.duration) {
      const months = parseInt(activeBooking.duration);
      if (!isNaN(months)) {
        const outDate = new Date(checkInDateObj);
        outDate.setMonth(outDate.getMonth() + months);
        checkOutDate = outDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    const today = new Date();
    let dueMonth = today.getMonth();
    let dueYear = today.getFullYear();
    if (today.getDate() > 10) {
      dueMonth++;
      if (dueMonth > 11) { dueMonth = 0; dueYear++; }
    }
    rentDueDate = new Date(dueYear, dueMonth, 10).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

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
          <div className="stay-item"><div className="stay-label">Room Number</div><div className="stay-value">{room}</div></div>
          <div className="stay-item"><div className="stay-label">Check-in Date</div><div className="stay-value">{checkIn}</div></div>
          <div className="stay-item"><div className="stay-label">Check-out Date</div><div className="stay-value">{checkOutDate}</div></div>
          <div className="stay-item"><div className="stay-label">Rent Due Date</div><div className="stay-value">{rentDueDate}</div></div>
          <div className="stay-item"><div className="stay-label">Monthly Rent</div><div className="stay-value">₹{Number(rent).toLocaleString()}</div></div>
          <div className="stay-item"><div className="stay-label">Booking Status</div><div className="stay-value"><span className={`badge-${status === 'active' || status === 'confirmed' ? 'active' : 'warning'}`} style={{textTransform: 'capitalize'}}>{status}</span></div></div>
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

      <div className="stats-grid">
        <div 
          className="stat-card" 
          onClick={() => navigate('/tenant/issues')} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          title="Click to view all Issues"
        >
          <div className="stat-label">Active Issues / Complaints <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span></div>
          <div className="stat-value">{complaintsCount}</div>
          <div className="stat-sub">Needs attention • Click to view</div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => navigate('/tenant/services')} 
          style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          title="Click to view Services"
        >
          <div className="stat-label">Pending Services <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span></div>
          <div className="stat-value">{pendingServicesCount}</div>
          <div className="stat-sub">In progress</div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => navigate('/tenant/payments')} 
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
          <div className="stat-value">126</div>
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
                onClick={() => navigate('/tenant/issues')}
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
                  onClick={() => navigate('/tenant/issues')}
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
                    onClick={() => navigate('/tenant/issues')}
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
                onClick={() => navigate('/tenant/complaints')}
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
                  onClick={() => navigate('/tenant/complaints')}
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
                      onClick={() => navigate('/tenant/complaints')}
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

      <div className="grid-2 mb-20" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-body">
            <div className="card-title">Payment History</div>
            <div className="bar-chart mt-14" style={{ marginTop: '14px' }}>
              <div className="bar-wrapper"><div className="bar" data-height="110" style={{height: 0}}></div><div className="bar-label">Oct</div></div>
              <div className="bar-wrapper"><div className="bar" data-height="115" style={{height: 0}}></div><div className="bar-label">Nov</div></div>
              <div className="bar-wrapper"><div className="bar" data-height="120" style={{height: 0}}></div><div className="bar-label">Dec</div></div>
              <div className="bar-wrapper"><div className="bar" data-height="118" style={{height: 0}}></div><div className="bar-label">Jan</div></div>
              <div className="bar-wrapper"><div className="bar" data-height="122" style={{height: 0}}></div><div className="bar-label">Feb</div></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="card-title">Expense Breakdown</div>
            <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px'}}>
              <div className="pie-chart"><div className="pie-center"></div></div>
              <div className="pie-legend">
                <div className="pie-legend-item"><span className="pie-dot" style={{background: 'var(--primary)'}}></span> Rent 75%</div>
                <div className="pie-legend-item"><span className="pie-dot" style={{background: '#f59e0b'}}></span> Services 9%</div>
                <div className="pie-legend-item"><span className="pie-dot" style={{background: '#3b82f6'}}></span> Utilities 16%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-reminder">
        <div className="reminder-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>schedule</span></div>
        <div className="reminder-text">Your monthly rent payment of <strong>₹{Number(rent).toLocaleString()}</strong> is due on <strong>{rentDueDate}</strong>. Please make the payment before the due date to avoid penalties.</div>
        <div className="reminder-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/payments')}>Pay Rent Now</button>
          <button className="btn btn-outline btn-sm" onClick={() => alert('Reminder set for Mar 9, 2026')}>Set Reminder</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
