import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { tenant, activeBooking, loading } = useAuth();
  
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [paymentsDue, setPaymentsDue] = useState(0);
  const [pendingServicesCount, setPendingServicesCount] = useState(0);

  const [paymentHistoryBars, setPaymentHistoryBars] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState({
    rentAmount: 0,
    servicesAmount: 0,
    depositAmount: 0,
    rentPercent: 85,
    servicesPercent: 15,
    depositPercent: 0,
  });

  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      try {
        if (!tenant) return;
        
        // Fetch complaints & issues & payments & services
        const [allComplaints, myIssues, allPayments, myServiceRequests] = await Promise.all([
          apiFetch('/complaints').catch(() => []),
          apiFetch('/issues/my').catch(() => []),
          apiFetch('/payments').catch(() => []),
          apiFetch('/service-requests/my').catch(() => []),
        ]);

        const userComplaints = (Array.isArray(allComplaints) ? allComplaints : []).filter(
          c => c.tenantId === tenant.id && c.status === 'open'
        );
        const openIssues = (Array.isArray(myIssues) ? myIssues : []).filter(
          i => i.status === 'open' || i.status === 'in_progress'
        );
        setComplaintsCount(userComplaints.length + openIssues.length);
        
        // Fetch payments
        const curM = new Date().getMonth();
        const curY = new Date().getFullYear();
        const userCompleted = (Array.isArray(allPayments) ? allPayments : []).filter(
          p => p.tenantId === tenant.id && (p.status === 'completed' || p.status === 'success' || p.status === 'verified')
        );

        const userCompletedThisMonth = userCompleted.filter(
          p => new Date(p.paidDate || p.createdAt).getMonth() === curM &&
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

        // Dynamic 5-month payment histogram from backend payments
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const pastMonths = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          pastMonths.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: monthNames[d.getMonth()],
            amount: 0,
          });
        }

        userCompleted.forEach(p => {
          const pDate = new Date(p.paidDate || p.createdAt);
          const m = pDate.getMonth();
          const y = pDate.getFullYear();
          const target = pastMonths.find(pm => pm.month === m && pm.year === y);
          if (target) {
            target.amount += Number(p.amount || 0);
          }
        });

        const maxMonthly = Math.max(...pastMonths.map(m => m.amount), 1);
        const calculatedBars = pastMonths.map(m => ({
          label: m.label,
          amount: m.amount,
          heightPercent: m.amount > 0 ? Math.min(80, Math.max(20, Math.round((m.amount / maxMonthly) * 80))) : 4,
        }));
        setPaymentHistoryBars(calculatedBars);

        // Dynamic Expense Breakdown
        const rentTotal = userCompleted.reduce((sum, p) => sum + Number(p.amount || 0), 0) || (activeBooking ? Number(activeBooking.rent || 0) : 0);
        const servicesTotal = (Array.isArray(myServiceRequests) ? myServiceRequests : []).reduce((sum, s) => {
          return sum + (s.status === 'completed' || s.status === 'scheduled' || s.status === 'in_progress' ? (Number(s.cost) || 500) : 0);
        }, 0);
        const depositTotal = Number(activeBooking?.deposit || 0);

        const totalExpenses = rentTotal + servicesTotal + depositTotal;
        const rentPct = totalExpenses > 0 ? Math.round((rentTotal / totalExpenses) * 100) : 85;
        const servPct = totalExpenses > 0 ? Math.round((servicesTotal / totalExpenses) * 100) : 15;
        const depPct = Math.max(0, 100 - rentPct - servPct);

        setExpenseBreakdown({
          rentAmount: rentTotal,
          servicesAmount: servicesTotal,
          depositAmount: depositTotal,
          rentPercent: rentPct,
          servicesPercent: servPct,
          depositPercent: depPct,
        });

      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    
    fetchStats();
  }, [tenant]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading your dashboard...</div>;
  }

  const propertyName = activeBooking?.property?.name || 'No Active Booking';
  const room = activeBooking?.room || '-';
  const checkIn = activeBooking?.checkIn || '-';
  const rent = activeBooking?.rent || 0;
  const status = activeBooking?.status || 'N/A';
  
  // Calculate checkout and rent due date dynamically based on booking
  let checkOutDate = '-';
  let rentDueDate = '-';
  
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
          <div className="stay-item"><div className="stay-label">Monthly Rent</div><div className="stay-value">₹{rent.toLocaleString()}</div></div>
          <div className="stay-item"><div className="stay-label">Booking Status</div><div className="stay-value"><span className={`badge-${status === 'active' ? 'active' : 'warning'}`} style={{textTransform: 'capitalize'}}>{status}</span></div></div>
          <div className="stay-item">
            <div className="stay-label">Utilities</div>
            <div className="utility-icons">
              <span className="utility-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>bolt</span></span>
              <span className="utility-icon">💧</span>
              <span className="utility-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>wifi</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Active Issues / Complaints <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>error</span></span></div><div className="stat-value">{complaintsCount}</div><div className="stat-sub">Needs attention</div></div>
        <div className="stat-card"><div className="stat-label">Pending Services <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>schedule</span></span></div><div className="stat-value">{pendingServicesCount}</div><div className="stat-sub">In progress</div></div>
        <div className="stat-card"><div className="stat-label">Payment Due <span className="stat-icon">₹</span></div><div className="stat-value" style={{color: 'var(--primary)'}}>₹{paymentsDue.toLocaleString()}</div><div className="stat-sub" style={{color: 'var(--danger)'}}>Action Required</div></div>
        <div className="stat-card"><div className="stat-label">Days Remaining <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>calendar_today</span></span></div><div className="stat-value">126</div><div className="stat-sub">Until check-out</div></div>
      </div>

      <div className="grid-2 mb-20" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ margin: 0 }}>Payment History</div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verified Payments</span>
            </div>
            <div className="bar-chart" style={{ marginTop: '16px' }}>
              {paymentHistoryBars.map((item, idx) => (
                <div key={idx} className="bar-wrapper" title={`${item.label}: ₹${item.amount.toLocaleString()}`}>
                  {item.amount > 0 && (
                    <div className="bar-val-tip">₹{item.amount >= 1000 ? `${(item.amount / 1000).toFixed(0)}k` : item.amount}</div>
                  )}
                  <div
                    className="bar"
                    style={{
                      height: `${item.heightPercent}%`,
                      opacity: item.amount > 0 ? 1 : 0.25,
                    }}
                  ></div>
                  <div className="bar-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-title">Expense Breakdown</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px' }}>
              <div
                className="pie-chart"
                style={{
                  background: `conic-gradient(var(--primary) 0% ${expenseBreakdown.rentPercent}%, #f59e0b ${expenseBreakdown.rentPercent}% ${expenseBreakdown.rentPercent + expenseBreakdown.servicesPercent}%, #3b82f6 ${expenseBreakdown.rentPercent + expenseBreakdown.servicesPercent}% 100%)`
                }}
              >
                <div className="pie-center"></div>
              </div>
              <div className="pie-legend">
                <div className="pie-legend-item">
                  <span className="pie-dot" style={{ background: 'var(--primary)' }}></span>
                  Rent {expenseBreakdown.rentPercent}% (₹{expenseBreakdown.rentAmount.toLocaleString()})
                </div>
                <div className="pie-legend-item">
                  <span className="pie-dot" style={{ background: '#f59e0b' }}></span>
                  Services {expenseBreakdown.servicesPercent}% (₹{expenseBreakdown.servicesAmount.toLocaleString()})
                </div>
                {expenseBreakdown.depositAmount > 0 && (
                  <div className="pie-legend-item">
                    <span className="pie-dot" style={{ background: '#3b82f6' }}></span>
                    Security Deposit {expenseBreakdown.depositPercent}% (₹{expenseBreakdown.depositAmount.toLocaleString()})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
