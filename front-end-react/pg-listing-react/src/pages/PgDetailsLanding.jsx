import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RAW_LISTINGS, RAW_FAQS } from '../data/listingsData';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

export default function PgDetailsLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedPG, setSelectedRoom, setSelectedRoommate } = useBooking();
  const { requireAuth } = useAuth();

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [dbRooms, setDbRooms] = useState([]);

  const pg = RAW_LISTINGS.find(p => String(p.id) === String(id)) || RAW_LISTINGS[0];

  useEffect(() => {
    let isMounted = true;
    fetch('http://localhost:3000/rooms', {
      headers: { 'x-role': 'super_admin' }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setDbRooms(data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [pg.id]);

  const handleBookRoom = (room) => {
    const isSingle = room.sharing === 'single' || room.capacity === 1;
    setSelectedPG(pg);
    setSelectedRoom(room);

    // CRITICAL: Strictly clear any roommate selection for Single Rooms
    if (isSingle) {
      setSelectedRoommate(null);
    }

    // Gatekeeper: Forces guest sign-in before booking!
    requireAuth((user) => {
      if (isSingle) {
        setSelectedRoommate(null);
        navigate(`/book/${pg.id}/review`);
      } else {
        navigate(`/book/${pg.id}/roommate`);
      }
    });
  };

  return (
    <div className="pg-details-container">
      {/* HERO IMAGE SECTION */}
      <div
        className="hero-image-section"
        style={{
          position: 'relative',
          height: '420px',
          background: `linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.3) 60%), url('${pg.image}') center/cover no-repeat`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '48px 0',
        }}
      >
        <div className="container" style={{ width: '100%', maxWidth: '1140px', margin: '0 auto', padding: '0 24px', color: '#fff' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(202,138,4,0.9)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✓ Verified Accommodation
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {pg.title}
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#facc15' }}>location_on</span>
              {pg.location}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#facc15' }}>star</span>
              {pg.rating} ({pg.reviewsCount || 1200}+ resident reviews)
            </span>
            <span>•</span>
            <span style={{ color: '#86efac', fontWeight: 600 }}>₹{pg.price.toLocaleString()}/mo onwards</span>
          </p>
        </div>
      </div>

      {/* STICKY IN-PAGE SUB-NAVBAR */}
      <div className="sticky-subnav">
        <div className="container" style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
          <a href="#About" className="subnav-link">About</a>
          <a href="#Amenities" className="subnav-link">Amenities</a>
          <a href="#Rooms" className="subnav-link highlight">Available Rooms</a>
          <a href="#Furnishings" className="subnav-link">Furnishings</a>
          <a href="#Reviews" className="subnav-link">Reviews</a>
          <a href="#FAQs" className="subnav-link">FAQs</a>
          <a href="#Contact" className="subnav-link">Contact</a>
        </div>
      </div>

      <div className="container page-content" style={{ maxWidth: '1140px', margin: '40px auto', padding: '0 24px' }}>
        {/* ABOUT SECTION */}
        <section className="detail-section" id="About">
          <h2 className="section-title">About This Property</h2>
          <p className="section-text" style={{ lineHeight: 1.8, color: '#475569', fontSize: '16px', marginBottom: '24px' }}>
            {pg.about || 'Welcome to Sunrise PG Residency, a premium paying guest accommodation designed for students and working professionals. Our property offers comfortable living spaces equipped with state-of-the-art facilities, healthy meals, and high-speed fiber connectivity.'}
          </p>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.residents || '50+'}</span>
              <span className="stat-desc">Current Residents</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.security || '24/7'}</span>
              <span className="stat-desc">CCTV &amp; Security</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.backup || '100%'}</span>
              <span className="stat-desc">Power Backup</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.established || '5+ Years'}</span>
              <span className="stat-desc">Excellence</span>
            </div>
          </div>
        </section>

        {/* AMENITIES SECTION */}
        <section className="detail-section" id="Amenities" style={{ marginTop: '50px' }}>
          <h2 className="section-title">Included Amenities</h2>
          <div className="amenities-grid">
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">wifi</span></div>
              <div>
                <strong>High-Speed WiFi</strong>
                <p>100 Mbps fiber broadband</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">restaurant</span></div>
              <div>
                <strong>3 Healthy Meals</strong>
                <p>Breakfast, lunch &amp; dinner</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">local_parking</span></div>
              <div>
                <strong>Parking Space</strong>
                <p>Secure two-wheeler parking</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">local_laundry_service</span></div>
              <div>
                <strong>Laundry Service</strong>
                <p>Automated washing machines</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">ac_unit</span></div>
              <div>
                <strong>Air Conditioning</strong>
                <p>Individual climate control</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">shield</span></div>
              <div>
                <strong>24/7 Security</strong>
                <p>Guard &amp; CCTV monitoring</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">bolt</span></div>
              <div>
                <strong>Power Backup</strong>
                <p>100% generator backup</p>
              </div>
            </div>
            <div className="amenity-card">
              <div className="amenity-icon"><span className="material-icons-outlined">water_drop</span></div>
              <div>
                <strong>24/7 Water Supply</strong>
                <p>RO purified drinking water</p>
              </div>
            </div>
          </div>
        </section>

        {/* AVAILABLE ROOMS SECTION (CORE BOOKING GATEWAY) */}
        <section className="detail-section" id="Rooms" style={{ marginTop: '60px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Available Rooms &amp; Rates</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                Select a room to begin reservation. Real-time availability verified with Neon Database.
              </p>
            </div>
            <span className="badge-live-available">🟢 Live Booking Active</span>
          </div>

          <div className="rooms-grid">
            {(pg.rooms || []).filter(room => {
              const isSingle = room.sharing === 'single' || room.capacity === 1;
              const matchingDbRooms = dbRooms.filter(r =>
                (String(r.propertyId) === String(pg.id) || String(r.property?.id) === String(pg.id)) &&
                (isSingle ? r.capacity === 1 : r.capacity === room.capacity)
              );

              // If database records exist for this room type:
              if (matchingDbRooms.length > 0) {
                const availableDbRooms = matchingDbRooms.filter(
                  r => (r.currentOccupancy || 0) < r.capacity && r.status !== 'full'
                );
                // CRITICAL REQUIREMENT: If a single room is already occupied (capacity 1 is full),
                // it MUST NOT be shown in the PG listings page.
                if (isSingle && availableDbRooms.length === 0) {
                  return false;
                }
              } else if (isSingle && (room.available === false || (room.occupied !== undefined && room.occupied >= room.capacity))) {
                return false;
              }
              return true;
            }).map((room, idx) => {
              const isSingle = room.sharing === 'single' || room.capacity === 1;
              const matchingDbRooms = dbRooms.filter(r =>
                (String(r.propertyId) === String(pg.id) || String(r.property?.id) === String(pg.id)) &&
                (isSingle ? r.capacity === 1 : r.capacity === room.capacity)
              );

              let isOccupied = false;
              let vacantCount = null;
              if (matchingDbRooms.length > 0) {
                const availableDbRooms = matchingDbRooms.filter(
                  r => (r.currentOccupancy || 0) < r.capacity && r.status !== 'full'
                );
                isOccupied = availableDbRooms.length === 0;
                vacantCount = availableDbRooms.length;
              } else if (room.available === false || (room.occupied !== undefined && room.occupied >= room.capacity)) {
                isOccupied = true;
              }

              return (
                <div
                  key={idx}
                  className={`room-selection-card ${room.sharing === 'double' ? 'featured-card' : ''} ${isOccupied ? 'card-sold-out' : ''}`}
                  style={isOccupied ? { opacity: 0.8, filter: 'grayscale(15%)' } : {}}
                >
                  <div className="room-card-img-wrap">
                    <img src={room.image} alt={room.type} />
                    <span
                      className={`room-sharing-tag ${isOccupied ? 'tag-sold-out' : ''}`}
                      style={isOccupied ? { background: '#dc2626' } : {}}
                    >
                      {isOccupied
                        ? '🔴 Fully Occupied (Sold Out)'
                        : isSingle
                        ? '🟢 Private Occupancy (Vacant)'
                        : `${vacantCount !== null ? vacantCount + ' Beds Available' : room.capacity + ' Sharing'}`}
                    </span>
                  </div>
                  <div className="room-card-content">
                    <h3>{room.type}</h3>
                    <div className="room-pricing">
                      <span className="room-rent-amount">₹{room.rent.toLocaleString()}</span>
                      <span className="room-rent-period">/month</span>
                    </div>
                    <p className="room-feature-note">
                      <span className="material-icons-outlined" style={{ fontSize: '16px', color: isOccupied ? '#dc2626' : '#ca8a04' }}>
                        {isOccupied ? 'block' : 'verified'}
                      </span>
                      {isOccupied ? 'Room is currently at 100% full capacity' : room.feature}
                    </p>
                    <div className="room-meta-row">
                      <span>Deposit: ₹{room.deposit.toLocaleString()}</span>
                      <span>{isOccupied ? 'Availability: 0 Vacant' : 'Electricity: Included'}</span>
                    </div>
                    <button
                      className={`btn-book-room ${isOccupied ? 'btn-disabled-occupied' : ''}`}
                      onClick={() => !isOccupied && handleBookRoom(room)}
                      disabled={isOccupied}
                      style={isOccupied ? { background: '#94a3b8', cursor: 'not-allowed', color: '#fff' } : {}}
                    >
                      {isOccupied ? 'Fully Occupied' : 'Book Now →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time DB sync notice if single room is at full capacity */}
          {dbRooms.some(r => (String(r.propertyId) === String(pg.id) || String(r.property?.id) === String(pg.id)) && r.capacity === 1 && ((r.currentOccupancy || 0) >= r.capacity || r.status === 'full')) && (
            <div style={{ marginTop: '16px', padding: '12px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>info</span>
              <span><strong>Neon DB Real-time Sync:</strong> Fully occupied Single Rooms (Capacity: 1) are actively filtered out from the booking selection to avoid overbooking.</span>
            </div>
          )}
        </section>

        {/* FURNISHINGS SECTION */}
        <section className="detail-section" id="Furnishings" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Room Furnishings</h2>
          <div className="furnishing-pills">
            <span className="f-pill"><span className="material-icons-outlined">bed</span> Wooden Bed &amp; Ortho Mattress</span>
            <span className="f-pill"><span className="material-icons-outlined">desk</span> Study Table &amp; Ergonomic Chair</span>
            <span className="f-pill"><span className="material-icons-outlined">checkroom</span> Spacious Wardrobe with Lock</span>
            <span className="f-pill"><span className="material-icons-outlined">hot_tub</span> Geyser / Hot Water</span>
            <span className="f-pill"><span className="material-icons-outlined">curtains</span> Window Blinds &amp; Curtains</span>
            <span className="f-pill"><span className="material-icons-outlined">power</span> Individual Power Sockets</span>
          </div>
        </section>

        {/* REVIEWS SECTION */}
        <section className="detail-section" id="Reviews" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Resident Reviews</h2>
          <div className="reviews-grid">
            <div className="review-card">
              <div className="review-header">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" alt="Resident" />
                <div>
                  <strong>Priya Sharma</strong>
                  <span className="review-meta">Software Engineer • 8 months resident</span>
                </div>
                <span className="review-rating">★ 5.0</span>
              </div>
              <p className="review-text">
                "The automated warden issue tracking and fast WiFi make staying here effortless. Food is hygienic and hot water is always available."
              </p>
            </div>
            <div className="review-card">
              <div className="review-header">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" alt="Resident" />
                <div>
                  <strong>Arun Kumar</strong>
                  <span className="review-meta">MBA Student • 1 year resident</span>
                </div>
                <span className="review-rating">★ 4.8</span>
              </div>
              <p className="review-text">
                "Very smooth onboarding! Completed the payment online and instantly received my tenant credentials. Highly recommended for students."
              </p>
            </div>
          </div>
        </section>

        {/* FAQS SECTION */}
        <section className="detail-section" id="FAQs" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {RAW_FAQS.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button
                  className="faq-question-btn"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <span className="material-icons-outlined">
                    {expandedFaq === idx ? 'remove' : 'add'}
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT / OWNER SECTION */}
        <section className="detail-section" id="Contact" style={{ marginTop: '60px', marginBottom: '80px' }}>
          <div className="contact-banner-card">
            <div className="contact-info-col">
              <h3>Have questions before booking?</h3>
              <p>Our property management team and in-house warden are available to assist you 7 days a week.</p>
              <div className="contact-details-row">
                <span>📞 +91 98765 43210</span>
                <span>✉️ warden@pgrentals.com</span>
                <span>📍 {pg.location}</span>
              </div>
            </div>
            <button className="btn-call-owner" onClick={() => alert('Warden Hotline: +91 98765 43210')}>
              Call Property Manager
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
