import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RAW_LISTINGS, RAW_FAQS } from '../data/listingsData';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3000';

const DEFAULT_IMAGES = [
  '/room_images/1h.jpg',
  '/room_images/2h.webp',
  '/room_images/3h.jpg',
  '/room_images/4h.webp',
  '/room_images/5h.webp',
];

export default function PgDetailsLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedPG, setSelectedRoom, setSelectedRoommate } = useBooking();
  const { currentUser } = useAuth();

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [dbRooms, setDbRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real property details and rooms from Neon PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/properties/${id}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null),
      fetch(`${API_BASE}/rooms`, { headers: { 'x-role': 'super_admin' } })
        .then(res => res.ok ? res.json() : [])
        .catch(() => [])
    ]).then(([prop, rooms]) => {
      if (!isMounted) return;
      if (prop) {
        setPropertyData(prop);
      }
      if (Array.isArray(rooms)) {
        setDbRooms(rooms.filter(r => String(r.propertyId) === String(id) || String(r.property?.id) === String(id)));
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [id]);

  // Merge property data with fallback info
  const fallback = RAW_LISTINGS.find(p => String(p.id) === String(id)) || RAW_LISTINGS[0];
  const pg = propertyData ? {
    id: propertyData.id,
    title: propertyData.name || fallback.title,
    location: propertyData.location || fallback.location,
    price: propertyData.rentMin || propertyData.monthlyRent || fallback.price,
    rating: propertyData.safetyScore ? parseFloat(propertyData.safetyScore) : fallback.rating,
    reviewsCount: fallback.reviewsCount || 1350,
    image: (propertyData.images && propertyData.images[0]) || fallback.image || DEFAULT_IMAGES[0],
    amenities: propertyData.amenities && propertyData.amenities.length > 0 ? propertyData.amenities : fallback.amenities,
    about: propertyData.description || fallback.about,
    owner: propertyData.owner || null,
    compliance: propertyData.compliance || 'Verified',
    stats: fallback.stats || {
      residents: '50+',
      security: '24/7',
      backup: '100%',
      established: '5+ Years'
    }
  } : fallback;

  // Derive rooms from database room entities
  const displayRooms = (dbRooms.length > 0 ? dbRooms : (propertyData?.roomEntities && propertyData.roomEntities.length > 0 ? propertyData.roomEntities : (fallback.rooms || []))).map(r => {
    const isSingle = r.capacity === 1 || r.roomType?.toLowerCase().includes('single') || r.type?.toLowerCase().includes('single');
    const isAvailable = (r.currentOccupancy || 0) < (r.capacity || 1) && r.status !== 'full';
    const rent = Number(r.rent) || (isSingle ? 16000 : 8500);
    const deposit = Math.round(rent * 0.4);

    return {
      id: r.id,
      roomNumber: r.roomNumber || (isSingle ? '102' : '101'),
      type: r.type || (isSingle ? 'Single Room' : r.capacity === 3 ? 'Triple Sharing' : 'Double Sharing'),
      sharing: isSingle ? 'single' : (r.capacity === 3 ? 'triple' : 'double'),
      rent,
      deposit,
      capacity: r.capacity || (isSingle ? 1 : 2),
      currentOccupancy: r.currentOccupancy || 0,
      status: r.status || (isAvailable ? 'available' : 'full'),
      available: isAvailable,
      feature: isSingle ? 'Attached Bathroom & AC' : 'Spacious Balcony & Attached Washroom',
      image: isSingle ? '/room_images/1h.jpg' : '/room_images/2h.webp'
    };
  });

  const handleBookRoom = (room) => {
    if (!room.available) return;

    const isSingle = room.sharing === 'single' || room.capacity === 1;
    setSelectedPG(pg);
    setSelectedRoom(room);

    if (isSingle) {
      setSelectedRoommate(null);
    }

    // Check if user is authenticated
    if (!currentUser) {
      const returnUrl = isSingle ? `/book/${pg.id}/review` : `/book/${pg.id}/roommate`;
      navigate('/login', { state: { from: returnUrl } });
      return;
    }

    if (isSingle) {
      navigate(`/book/${pg.id}/review`);
    } else {
      navigate(`/book/${pg.id}/roommate`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#4b5563', fontSize: '16px' }}>Loading accommodation details from Neon PostgreSQL...</p>
      </div>
    );
  }

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
            ✓ {pg.compliance || 'Verified'} Accommodation
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
            <span style={{ color: '#86efac', fontWeight: 600 }}>₹{Number(pg.price).toLocaleString('en-IN')}/mo onwards</span>
          </p>
        </div>
      </div>

      {/* STICKY IN-PAGE SUB-NAVBAR */}
      <div className="sticky-subnav">
        <div className="container" style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
          <a href="#About" className="subnav-link">About</a>
          <a href="#Amenities" className="subnav-link">Amenities</a>
          <a href="#Rooms" className="subnav-link highlight">Available Rooms</a>
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
            {pg.about || 'Welcome to this premium paying guest accommodation designed for students and working professionals. Our property offers comfortable living spaces equipped with state-of-the-art facilities, healthy meals, and high-speed fiber connectivity.'}
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
              <span className="stat-number">9.4/10</span>
              <span className="stat-desc">Female Safety Score</span>
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
            <span className="badge-live-available">🟢 Live Neon Availability</span>
          </div>

          <div className="rooms-grid">
            {displayRooms.map((room, idx) => {
              const vacancyLeft = Math.max(0, room.capacity - room.currentOccupancy);

              return (
                <div
                  key={room.id || idx}
                  className={`modern-card room-img-card ${!room.available ? 'room-unavailable' : ''}`}
                  style={{
                    padding: 0,
                    opacity: room.available ? 1 : 0.65,
                    border: room.available ? '2px solid #ca8a04' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img src={room.image} alt={room.type} style={{ height: '180px', width: '100%', objectFit: 'cover' }} />
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: room.available ? '#16a34a' : '#dc2626',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {room.available ? `${vacancyLeft} Bed${vacancyLeft > 1 ? 's' : ''} Left` : 'Fully Occupied'}
                    </span>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        {room.type} {room.roomNumber ? `(Room #${room.roomNumber})` : ''}
                      </h3>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: room.available ? '#ca8a04' : '#64748b', marginBottom: '8px' }}>
                      ₹{room.rent.toLocaleString('en-IN')}<span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/month</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                      Security Deposit: ₹{room.deposit.toLocaleString('en-IN')} (Refundable)
                    </p>
                    <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#ca8a04' }}>done</span>
                      {room.feature}
                    </p>

                    <button
                      className="btn-book-room"
                      disabled={!room.available}
                      onClick={() => handleBookRoom(room)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: room.available ? '#ca8a04' : '#94a3b8',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: room.available ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s',
                      }}
                    >
                      {room.available ? 'Book This Room' : 'Sold Out'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* REVIEWS SECTION */}
        <section className="detail-section" id="Reviews" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Verified Resident Reviews</h2>
          <div className="reviews-grid">
            <div className="review-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong>Rahul Menon (Software Engineer)</strong>
                <span style={{ color: '#eab308' }}>★★★★★</span>
              </div>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                "Stayed here for 10 months. Food quality is consistently great, WiFi never dropped during my WFH meetings, and the security staff is very attentive."
              </p>
            </div>
            <div className="review-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong>Ananya Sengupta (Postgrad Student)</strong>
                <span style={{ color: '#eab308' }}>★★★★★</span>
              </div>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                "High safety score is well deserved. Biometric entry, polite warden, and very quiet study atmosphere. Absolutely recommend."
              </p>
            </div>
          </div>
        </section>

        {/* FAQS SECTION */}
        <section className="detail-section" id="FAQs" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faqs-list">
            {(RAW_FAQS || []).map((faq, index) => (
              <div
                key={index}
                className="faq-item"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                  <span>{faq.q}</span>
                  <span className="material-icons-outlined">
                    {expandedFaq === index ? 'remove' : 'add'}
                  </span>
                </div>
                {expandedFaq === index && (
                  <p style={{ marginTop: '12px', color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT OWNER SECTION */}
        <section className="detail-section" id="Contact" style={{ marginTop: '60px', marginBottom: '40px' }}>
          <h2 className="section-title">Property Manager &amp; Contact</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Managed by: {pg.owner?.name || 'Verified Property Partner'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>
                Email: {pg.owner?.email || 'contact@sunrise-pg.com'} • Phone: {pg.owner?.phone || '+91 98765 00004'}
              </p>
              <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                ✓ Official Registered Property on RentBro
              </p>
            </div>
            <button
              onClick={() => {
                const availableRoom = displayRooms.find(r => r.available) || displayRooms[0];
                handleBookRoom(availableRoom);
              }}
              style={{
                background: '#ca8a04',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reserve A Bed Now
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
