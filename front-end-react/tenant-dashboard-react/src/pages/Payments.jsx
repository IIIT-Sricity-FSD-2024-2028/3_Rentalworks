import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Payments = () => {
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  
  const { tenant, activeBooking } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchPayments = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const data = await apiFetch('/payments');
      const userPayments = data.filter(p => p.tenantId === tenant.id);
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

  const handleProcessPayment = async () => {
    if (!activeBooking) {
      alert("No active booking found to pay for.");
      return;
    }

    try {
      setProcessing(true);
      
      const payload = {
        tenantId: tenant.id,
        propertyId: activeBooking.propertyId,
        room: activeBooking.room,
        amount: activeBooking.rent,
        method: paymentMethod,
        transactionId: `TXN-${Date.now()}`
      };

      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      alert('Payment Processed Successfully!');
      setIsPaying(false);
      fetchPayments(); // Refresh the list
    } catch (error) {
      alert('Payment failed.');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const pendingAmount = activeBooking ? activeBooking.rent : 0;
  
  // Get paid this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const paidThisMonth = payments
    .filter(p => {
      if (p.status !== 'completed' && p.status !== 'success' && p.status !== 'verified') return false; // assuming success/completed/verified
      const d = new Date(p.paidDate || p.createdAt); // assuming paidDate or fallback
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  let dueMonth = currentMonth;
  let dueYear = currentYear;
  if (new Date().getDate() > 10) {
    dueMonth++;
    if (dueMonth > 11) { dueMonth = 0; dueYear++; }
  }
  const rentDueDate = new Date(dueYear, dueMonth, 10).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (isPaying) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm mb-16" onClick={() => setIsPaying(false)} style={{marginBottom: '16px'}} disabled={processing}>← Cancel Payment</button>
        <div className="payment-flow-layout">
          <div>
            <div className="card mb-16" style={{marginBottom: '16px'}}>
              <div className="card-body">
                <div className="card-title">Select Payment Method</div>
                <div className="grid-3 mb-16" style={{marginTop: '14px', marginBottom: '16px'}}>
                  <div className={`payment-method-card ${paymentMethod === 'upi' ? 'active' : ''}`} onClick={() => !processing && setPaymentMethod('upi')}>
                    <div className="payment-method-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>smartphone</span></div>
                    <div className="payment-method-name">UPI</div>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => !processing && setPaymentMethod('card')}>
                    <div className="payment-method-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>credit_card</span></div>
                    <div className="payment-method-name">Card</div>
                  </div>
                  <div className={`payment-method-card ${paymentMethod === 'netbanking' ? 'active' : ''}`} onClick={() => !processing && setPaymentMethod('netbanking')}>
                    <div className="payment-method-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>account_balance</span></div>
                    <div className="payment-method-name">Net Banking</div>
                  </div>
                </div>
                
                {paymentMethod === 'upi' && (
                  <div className="payment-panel">
                    <div className="form-group">
                      <label>Your UPI ID</label>
                      <input type="text" placeholder="yourname@upi" disabled={processing} />
                    </div>
                    <button className="btn btn-primary btn-full" onClick={handleProcessPayment} disabled={processing}>{processing ? 'Processing...' : 'Continue with UPI'}</button>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="payment-panel">
                    <div className="form-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="1234 5678 9012 3456" disabled={processing} />
                    </div>
                    <button className="btn btn-primary btn-full" onClick={handleProcessPayment} disabled={processing}>{processing ? 'Processing...' : 'Continue with Card'}</button>
                  </div>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="payment-panel">
                    <div className="form-group">
                      <label>Select Bank</label>
                      <select disabled={processing}>
                        <option>State Bank of India</option>
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>Axis Bank</option>
                      </select>
                    </div>
                    <button className="btn btn-primary btn-full" onClick={handleProcessPayment} disabled={processing}>{processing ? 'Processing...' : 'Continue with Net Banking'}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="payment-details-card">
            <h3 className="card-title mb-16" style={{marginBottom: '16px'}}>Payment Details</h3>
            <div className="payment-detail-row" style={{display: 'flex', justifyContent: 'space-between'}}><span className="pd-label">Payment Type</span><span className="pd-value dyn-pay-type">Rent</span></div>
            <div className="payment-detail-row" style={{display: 'flex', justifyContent: 'space-between'}}><span className="pd-label">Due Date</span><span className="pd-value dyn-pay-due">{rentDueDate}</span></div>
            <div className="payment-detail-row" style={{display: 'flex', justifyContent: 'space-between'}}><span className="pd-label">Processing Fee</span><span className="pd-value" style={{color: 'var(--success)'}}>₹0</span></div>
            <div className="payment-total" style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px'}}><span className="pt-label">Total Amount</span><span className="pt-value dyn-pay-amount">₹{pendingAmount.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Payments</h1>
        <p>Manage your rent and utility payments</p>
      </div>
      
      <div className="grid-4 mb-20" style={{marginBottom: '20px'}}>
        <div className="stat-card"><div className="stat-label">Total Pending <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>schedule</span></span></div><div className="stat-value" style={{color: 'var(--warning)'}}>₹{pendingAmount.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Paid this Month <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>check_circle</span></span></div><div className="stat-value" style={{color: 'var(--success)'}}>₹{paidThisMonth.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Monthly Rent <span>₹</span></div><div className="stat-value">₹{pendingAmount.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Next Due Date <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>calendar_today</span></span></div><div className="stat-value" style={{fontSize: '16px'}}>{rentDueDate}</div></div>
      </div>

      <div className="card mb-20" style={{marginBottom: '20px'}}>
        <div className="card-body">
          <div className="card-title">Upcoming Payments</div>
          <div className="mt-14" style={{marginTop: '14px'}}>
            <div className="payment-item">
              <div className="payment-info">
                <div className="payment-type">Monthly Rent</div>
                <div className="payment-sub">Due: {rentDueDate}</div>
              </div>
              <div className="payment-right">
                <div className="payment-amount">₹{pendingAmount.toLocaleString()}</div>
                <button className="btn btn-primary btn-sm" style={{marginTop: '4px'}} onClick={() => setIsPaying(true)}>Pay Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-title">Payment History</div>
          <div className="mt-14" style={{marginTop: '14px', overflowX: 'auto'}}>
            {loading ? (
              <p>Loading history...</p>
            ) : payments.length === 0 ? (
              <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No payment history.</p>
            ) : (
              <table className="payment-table">
                <thead><tr><th>Type</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>Rent</td>
                      <td>₹{p.amount.toLocaleString()}</td>
                      <td>{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{textTransform: 'uppercase'}}>{p.method}</td>
                      <td><span className={`badge-${p.status === 'success' || p.status === 'completed' ? 'active' : 'warning'}`} style={{textTransform: 'capitalize'}}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
