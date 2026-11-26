import React from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
=======
import { formatINR } from '../utils/normalize';
>>>>>>> redux-migration

const AVAILABILITY_STYLE = {
  available: { background: '#dcfce7', color: '#15803d' },
  full: { background: '#fee2e2', color: '#b91c1c' },
  no_rooms: { background: '#f1f5f9', color: '#475569' },
};

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { id, title, location, price, rating, features, note, image } = listing;

  // Fully-booked PGs stay viewable (details, reviews, contact) — only booking is blocked.
  const handleCardClick = () => {
    navigate(`/pg/${id}`);
  };

  const cardStyle = isDisabled ? { opacity: '0.75', cursor: 'pointer' } : { cursor: 'pointer' };
=======
  const { id, title, location, price, rentMax, features, image, availability, availabilityText, genderLabel, amenityLabels } = listing;

  // Fully booked PGs stay viewable; only booking is blocked on the details page.
  const open = () => navigate(`/pg/${id}`);
>>>>>>> redux-migration

  return (
    <div
      className="listing-card"
      style={{ cursor: 'pointer', opacity: availability === 'available' ? 1 : 0.85 }}
      onClick={open}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      <div className="image-box">
        <img src={image} alt={title} loading="lazy" />
<<<<<<< HEAD
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
=======
        <span
          className="badge"
          style={{ position: 'absolute', top: 12, right: 12, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, ...AVAILABILITY_STYLE[availability] }}
        >
          {availabilityText}
>>>>>>> redux-migration
        </span>
      </div>
      <div className="listing-content">
        <h3>{title}</h3>
        <p className="location">
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>location_on</span>
          {location}
        </p>
<<<<<<< HEAD
        <div className="price">{price ? <>₹{price.toLocaleString('en-IN')} <span>/month</span></> : <span>Price on request</span>}</div>
=======
        <div className="price">
          {price ? (
            <>
              {formatINR(price)}
              {rentMax > price ? ` – ${formatINR(rentMax)}` : ''} <span>/month</span>
            </>
          ) : (
            <span>Rent not listed</span>
          )}
        </div>
>>>>>>> redux-migration
        <div className="features">
          <span className="tag">
            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>wc</span>
            {genderLabel}
          </span>
          {features.map((feature) => (
            <span key={feature.text} className="tag">
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{feature.icon}</span>
              {feature.text}
            </span>
          ))}
        </div>
<<<<<<< HEAD
        <p className="note">{note}</p>
        <button
          className="view-btn"
          style={isDisabled ? { background: '#e2e8f0', color: '#64748b', boxShadow: 'none' } : {}}
        >
          {isDisabled ? 'Fully Booked · View Details' : 'View Details'}
        </button>
=======
        {amenityLabels.length > 0 && (
          <p className="note">
            {amenityLabels.slice(0, 4).join(' · ')}
            {amenityLabels.length > 4 ? ` +${amenityLabels.length - 4} more` : ''}
          </p>
        )}
        <button className="view-btn" type="button">View details</button>
>>>>>>> redux-migration
      </div>
    </div>
  );
}
