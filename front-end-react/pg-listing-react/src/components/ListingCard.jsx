import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ListingCard({ listing, isDisabled }) {
  const navigate = useNavigate();
  const { id, title, location, price, rating, features, note, image } = listing;

  // Fully-booked PGs stay viewable (details, reviews, contact) — only booking is blocked.
  const handleCardClick = () => {
    navigate(`/pg/${id}`);
  };

  const cardStyle = isDisabled ? { opacity: '0.75', cursor: 'pointer' } : { cursor: 'pointer' };

  return (
    <div className="listing-card" style={cardStyle} onClick={handleCardClick}>
      <div className="image-box">
        <img src={image} alt={title} loading="lazy" />
        {listing.gender === 'girls' && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: '#be185d',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}
          >
            👩 Girls Only
          </span>
        )}
        <span className="badge badge-rating">
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>star</span> {rating ? rating : 'New'}
        </span>
      </div>
      <div className="listing-content">
        <h3>{title}</h3>
        <p className="location">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>location_on</span>
          {location}
        </p>
        <div className="price">{price ? <>₹{price.toLocaleString('en-IN')} <span>/month</span></> : <span>Price on request</span>}</div>
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
          {isDisabled ? 'Fully Booked · View Details' : 'View Details'}
        </button>
      </div>
    </div>
  );
}
