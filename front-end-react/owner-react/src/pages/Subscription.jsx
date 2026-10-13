import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Subscription: Owner pricing tier selection with checkout modal
export default function Subscription({ onSubscribe }) {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSelectPlan = (planName, price) => {
    setSelectedPlan({ plan: planName, price: price });
    setIsModalOpen(true);
    setIsProcessing(true);
    setIsSuccess(false);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  const handleProceedToDashboard = () => {
    if (selectedPlan && onSubscribe) {
      onSubscribe(selectedPlan.plan, selectedPlan.price);
    }
    setIsModalOpen(false);
    navigate('/');
  };

  return (
    <div className="subs-container">
      <div className="subs-header">
        <h1>Choose Your Subscription Plan</h1>
        <p>Select a plan to activate your Owner Dashboard and list your properties on RentBro.</p>
      </div>

      <div className="plans-grid">
        {/* Standard Plan */}
        <div className="plan-card basic">
          <div className="plan-name">Standard</div>
          <div className="plan-price">
            ₹5,000<span>/year</span>
          </div>
          <p className="text-sub">Perfect for single property owners.</p>
          <ul className="plan-features">
            <li>
              <span className="material-icons-outlined">check_circle</span> List 1 PG Property
            </li>
            <li>
              <span className="material-icons-outlined">check_circle</span> Basic Dashboard Analytics
            </li>
            <li>
              <span className="material-icons-outlined">check_circle</span> Tenant Management Tools
            </li>
            <li>
              <span className="material-icons-outlined icon-disabled">cancel</span> Priority Support
            </li>
          </ul>
          <button
            className="btn-subscribe"
            onClick={() => handleSelectPlan('Standard', 5000)}
          >
            Get Standard
          </button>
        </div>

        {/* Premium Plan */}
        <div className="plan-card premium">
          <div className="plan-badge">Most Popular</div>
          <div className="plan-name">Premium</div>
          <div className="plan-price">
            ₹8,000<span>/year</span>
          </div>
          <p className="text-sub">For owners with multiple properties.</p>
          <ul className="plan-features">
            <li>
              <span className="material-icons-outlined">check_circle</span> List Unlimited Properties
            </li>
            <li>
              <span className="material-icons-outlined">check_circle</span> Advanced Analytics & Reports
            </li>
            <li>
              <span className="material-icons-outlined">check_circle</span> Tenant Management Tools
            </li>
            <li>
              <span className="material-icons-outlined">check_circle</span> 24/7 Priority Support
            </li>
          </ul>
          <button
            className="btn-subscribe"
            onClick={() => handleSelectPlan('Premium', 8000)}
          >
            Get Premium
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isModalOpen && (
        <div className="checkout-modal" id="checkoutModal">
          <div className="checkout-box">
            {isProcessing && (
              <div id="checkout-loading">
                <div className="mock-spinner"></div>
                <h3>Processing Payment</h3>
                <p className="text-sub">Please do not close this window.</p>
              </div>
            )}

            {isSuccess && (
              <div id="checkout-success">
                <span className="material-icons-outlined checkout-success-icon">
                  check_circle
                </span>
                <h3>Payment Successful!</h3>
                <p className="text-sub-mb">
                  Your subscription for <strong>{selectedPlan ? selectedPlan.plan : ''} plan</strong> is now active.
                </p>
                <button
                  className="btn-subscribe"
                  onClick={handleProceedToDashboard}
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
