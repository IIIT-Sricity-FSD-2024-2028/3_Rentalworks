import React from 'react';

export default function ListingCard({ listing, isDisabled }) {
  const { title, location, price, rating, features, note, image } = listing;

  const cardStyle = isDisabled ? {
    opacity: '0.6',
    pointerEvents: 'none'
  } : { cursor: 'pointer' };

  return (
    <div className="listing-card" style={cardStyle} onClick={() => window.location.href = '#'}>
      <div className="image-box">
        <img src={image} alt={title} loading="lazy" />
        <span className="badge badge-rating">
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>star</span> {rating}
        </span>
      </div>
      <div className="listing-content">
        <h3>{title}</h3>
        <p className="location">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>location_on</span>
          {location}
        </p>
        <div className="price">₹{price.toLocaleString()} <span>/month</span></div>
        <div className="features">
          {features.map((feature, idx) => (
            <span key={idx} className="tag">
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>{feature.icon}</span> 
              {feature.text}
            </span>
          ))}
        </div>
        <p className="note">{note}</p>
        <button 
          className="view-btn"
          style={isDisabled ? { background: '#e2e8f0', color: '#64748b', boxShadow: 'none' } : {}}
        >
          {isDisabled ? 'Currently Unavailable' : 'View Details'}
        </button>
      </div>
    </div>
  );
}
