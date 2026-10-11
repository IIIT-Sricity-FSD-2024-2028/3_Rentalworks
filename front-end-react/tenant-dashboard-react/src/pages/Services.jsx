import React from 'react';

const Services = () => {
  return (
    <div>
      <div className="page-header">
        <h1>Services</h1>
        <p>Available amenities and services</p>
      </div>
      
      <div className="grid-3 mb-20" style={{marginBottom: '20px'}}>
        <div className="stat-card"><div className="stat-label">Available Services <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>build</span></span></div><div className="stat-value">4</div></div>
        <div className="stat-card"><div className="stat-label">Active Requests <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>schedule</span></span></div><div className="stat-value" style={{color: 'var(--info)'}}>0</div></div>
        <div className="stat-card"><div className="stat-label">Completed <span><span className="material-icons-outlined" style={{fontSize: '24px'}}>check_circle</span></span></div><div className="stat-value" style={{color: 'var(--success)'}}>1</div></div>
      </div>
      
      <div className="card mb-20" style={{marginBottom: '20px'}}>
        <div className="card-body">
          <div className="card-title">My Active Requests</div>
          <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '10px', marginTop: '14px'}}>
            No active service requests.
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="service-card">
          <div className="service-header"><span className="service-header-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>local_laundry_service</span></span><div><div className="service-header-title">Laundry</div><span className="service-available-badge">Available</span></div></div>
          <div className="service-body">
            <div className="service-price-bar"><span className="service-price-label">Price:</span><span className="service-price-value">₹50 per kg</span></div>
            <button className="btn btn-primary btn-full">View &amp; Use Service</button>
          </div>
        </div>
        
        <div className="service-card">
          <div className="service-header"><span className="service-header-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>directions_car</span></span><div><div className="service-header-title">Parking</div><span className="service-available-badge">Available</span></div></div>
          <div className="service-body">
            <div className="service-price-bar"><span className="service-price-label">Price:</span><span className="service-price-value">₹500/month</span></div>
            <button className="btn btn-primary btn-full">View &amp; Use Service</button>
          </div>
        </div>
        
        <div className="service-card">
          <div className="service-header"><span className="service-header-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>sports_esports</span></span><div><div className="service-header-title">Indoor Games</div><span className="service-available-badge">Available</span></div></div>
          <div className="service-body">
            <div className="service-price-bar"><span className="service-price-label">Price:</span><span className="service-price-value">Included in rent</span></div>
            <button className="btn btn-primary btn-full">View &amp; Use Service</button>
          </div>
        </div>
        
        <div className="service-card">
          <div className="service-header"><span className="service-header-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>coffee</span></span><div><div className="service-header-title">Pantry</div><span className="service-available-badge">Available</span></div></div>
          <div className="service-body">
            <div className="service-price-bar"><span className="service-price-label">Price:</span><span className="service-price-value">Included in rent</span></div>
            <button className="btn btn-primary btn-full">View &amp; Use Service</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;
