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

const AMENITY_META = {
  wifi: { label: 'High-Speed WiFi', desc: '100 Mbps fiber broadband', icon: 'wifi' },
  ac: { label: 'Air Conditioning', desc: 'Individual climate control', icon: 'ac_unit' },
  cctv: { label: '24/7 Security', desc: 'Guard & CCTV monitoring', icon: 'shield' },
  security: { label: '24/7 Security Guard', desc: 'Guard & CCTV monitoring', icon: 'shield' },
  parking: { label: 'Parking Space', desc: 'Secure parking space', icon: 'local_parking' },
  laundry: { label: 'Laundry Service', desc: 'Automated washing machines', icon: 'local_laundry_service' },
  meals: { label: '3 Healthy Meals', desc: 'Breakfast, lunch & dinner', icon: 'restaurant' },
  food: { label: 'Healthy Meals', desc: 'Nutritious daily meals', icon: 'restaurant' },
  geyser: { label: 'Hot Water Geyser', desc: '24/7 hot water supply', icon: 'hot_tub' },
  backup: { label: 'Power Backup', desc: '100% generator backup', icon: 'bolt' },
  water: { label: '24/7 Water Supply', desc: 'RO purified drinking water', icon: 'water_drop' },
  gym: { label: 'Gym Facility', desc: 'Fitness equipment for residents', icon: 'fitness_center' },
  mess: { label: 'Dining Hall', desc: 'Hygienic communal mess', icon: 'lunch_dining' },
};

export default function PgDetailsLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedPG, setSelectedRoom, setSelectedRoommate } = useBooking();
  const { currentUser, requireAuth, updateUserGender } = useAuth();

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [dbRooms, setDbRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gender policy and booking workflow states
  const [eligibilityError, setEligibilityError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [promptGenderModalOpen, setPromptGenderModalOpen] = useState(false);
  const [selectedGenderChoice, setSelectedGenderChoice] = useState('female');
  const [genderSaving, setGenderSaving] = useState(false);
  const [pendingRoom, setPendingRoom] = useState(null);

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
  const propertyGender = (propertyData?.gender || fallback?.gender || 'unisex').toLowerCase();
  const pgSafetyScore = propertyData?.safetyScore || fallback?.safetyScore || (propertyGender === 'girls' ? '9.6' : '9.5');
  const pgAbout = propertyData?.description || fallback?.about || 'Welcome to this premier accommodation offering premium living spaces designed for comfort, convenience, and community.';
  const rawAmenities = propertyData?.amenities && propertyData.amenities.length > 0
    ? propertyData.amenities
    : (fallback?.amenities || ['wifi', 'ac', 'cctv', 'parking', 'water', 'backup']);

  const pg = propertyData ? {
    id: propertyData.id,
    title: propertyData.name || fallback.title,
    location: propertyData.location || (propertyData.city ? `${propertyData.address ? propertyData.address + ', ' : ''}${propertyData.city}` : fallback.location),
    price: propertyData.rentMin || propertyData.monthlyRent || fallback.price,
    rating: propertyData.safetyScore ? parseFloat(propertyData.safetyScore) : fallback.rating,
    safetyScore: pgSafetyScore,
    reviewsCount: fallback.reviewsCount || 1350,
    image: (propertyData.images && propertyData.images[0]) || fallback.image || DEFAULT_IMAGES[0],
    amenities: rawAmenities,
    about: pgAbout,
    gender: propertyGender,
    safetyLabel: propertyGender === 'girls'
      ? 'Female Safety Score'
      : 'Safety Score',
    owner: propertyData.owner || null,
    compliance: propertyData.compliance || 'Verified',
    stats: {
      residents: propertyData.totalRooms ? `${propertyData.totalRooms * 2}+` : (fallback.stats?.residents || '50+'),
      security: propertyGender === 'girls' ? '24/7 CCTV & Biometric' : '24/7 CCTV & Security',
      backup: '100%',
      established: fallback.stats?.established || '5+ Years'
    }
  } : {
    ...fallback,
    gender: propertyGender,
    safetyScore: pgSafetyScore,
    safetyLabel: propertyGender === 'girls'
      ? 'Female Safety Score'
      : 'Safety Score',
    about: pgAbout,
    amenities: rawAmenities,
  };

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

  const isManagementRole = (role) =>
    ['admin', 'owner', 'warden', 'super_admin'].includes((role || '').toLowerCase());

  const checkAndProceedBooking = (user, room) => {
    if (!room || !room.available) return;

    if (user && isManagementRole(user.role)) {
      const msg = `Unauthorized Access: Management accounts (${user.role.toUpperCase()}) cannot make tenant bookings. Please log in with a guest or tenant account.`;
      setRoleError(msg);
      window.alert(msg);
      return;
    }

    // Gender Policy Verification: Only girls can book a Girls PG
    const pGender = (pg.gender || '').toLowerCase();
    const uGender = (user?.gender || '').toLowerCase();
    const isGirlsPG = pGender === 'girls' || pg.title?.toLowerCase().includes('girls');

    if (isGirlsPG) {
      if (uGender === 'male' || uGender === 'boy' || uGender === 'm') {
        const msg = `You cannot book this PG! "${pg.title}" is strictly a Girls Only accommodation. Male residents cannot book this property.`;
        setEligibilityError(msg);
        window.alert(msg);
        return;
      }
      if (!uGender) {
        setPendingRoom(room);
        setPromptGenderModalOpen(true);
        return;
      }
      if (uGender !== 'female' && uGender !== 'f' && uGender !== 'girl') {
        const msg = `You cannot book this PG! "${pg.title}" is strictly a Girls Only accommodation.`;
        setEligibilityError(msg);
        window.alert(msg);
        return;
      }
    }

    // Eligible! Proceed to roommate selection or direct review
    const isSingle = room.sharing === 'single' || room.capacity === 1;
    setSelectedPG(pg);
    setSelectedRoom(room);

    if (isSingle) {
      setSelectedRoommate(null);
      navigate(`/book/${pg.id}/review`);
    } else {
      navigate(`/book/${pg.id}/roommate`);
    }
  };

  const handleBookRoom = (room) => {
    if (!room || !room.available) return;
    setEligibilityError('');
    setRoleError('');

    setSelectedPG(pg);
    setSelectedRoom(room);

    const isSingle = room.sharing === 'single' || room.capacity === 1;
    const targetBookingPage = isSingle ? `/book/${pg.id}/review` : `/book/${pg.id}/roommate`;

    // If not authenticated, navigate to the initial sign-in page (/login) with the target booking page
    if (!currentUser) {
      navigate('/login', { state: { from: targetBookingPage } });
      return;
    }

    checkAndProceedBooking(currentUser, room);
  };

  const handleSaveMissingGender = async () => {
    setGenderSaving(true);
    try {
      const isGirlsPG = (pg.gender || '').toLowerCase() === 'girls' || pg.title?.toLowerCase().includes('girls');
      if (isGirlsPG && selectedGenderChoice === 'male') {
        setPromptGenderModalOpen(false);
        const msg = `You cannot book this PG! "${pg.title}" is strictly a Girls Only accommodation. Male residents cannot book this property.`;
        setEligibilityError(msg);
        window.alert(msg);
        return;
      }

      const updatedUser = await updateUserGender(selectedGenderChoice);
      setPromptGenderModalOpen(false);
      const roomToContinue = pendingRoom;
      setPendingRoom(null);
      if (roomToContinue) {
        checkAndProceedBooking(updatedUser || { ...currentUser, gender: selectedGenderChoice }, roomToContinue);
      }
    } catch (err) {
      console.error('Failed to update gender:', err);
      setPromptGenderModalOpen(false);
    } finally {
      setGenderSaving(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(202,138,4,0.9)', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              ✓ {pg.compliance || 'Verified'} Accommodation
            </div>
            {pg.gender === 'girls' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#be185d',
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                👩 Girls Only
              </div>
            )}
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
            {pg.about}
          </p>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.residents || '50+'}</span>
              <span className="stat-desc">Current Residents</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.security || '24/7'}</span>
              <span className="stat-desc">Security &amp; Monitoring</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats?.backup || '100%'}</span>
              <span className="stat-desc">Power Backup</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.safetyScore}/10</span>
              <span className="stat-desc">{pg.safetyLabel}</span>
            </div>
          </div>
        </section>

        {/* AMENITIES SECTION */}
        <section className="detail-section" id="Amenities" style={{ marginTop: '50px' }}>
          <h2 className="section-title">Included Amenities</h2>
          <div className="amenities-grid">
            {(pg.amenities || ['wifi', 'ac', 'cctv', 'parking', 'water', 'backup']).map((key, idx) => {
              const meta = AMENITY_META[key.toLowerCase()] || {
                label: key.charAt(0).toUpperCase() + key.slice(1),
                desc: 'Verified facility for all residents',
                icon: 'check_circle'
              };
              return (
                <div key={idx} className="amenity-card">
                  <div className="amenity-icon">
                    <span className="material-icons-outlined">{meta.icon}</span>
                  </div>
                  <div>
                    <strong>{meta.label}</strong>
                    <p>{meta.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AVAILABLE ROOMS SECTION (CORE BOOKING GATEWAY) */}
        <section className="detail-section" id="Rooms" style={{ marginTop: '60px' }}>
          {eligibilityError && (
            <div style={{
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-icons-outlined" style={{ fontSize: '32px', color: '#dc2626' }}>
                  block
                </span>
                <div>
                  <strong style={{ display: 'block', color: '#991b1b', fontSize: '15px', marginBottom: '2px' }}>
                    Gender Policy Eligibility Notice
                  </strong>
                  <span style={{ color: '#b91c1c', fontSize: '14px', lineHeight: 1.5 }}>
                    {eligibilityError}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEligibilityError('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: '#991b1b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>
          )}

          {roleError && (
            <div style={{
              background: '#fffbeb',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-icons-outlined" style={{ fontSize: '32px', color: '#d97706' }}>
                  admin_panel_settings
                </span>
                <div>
                  <strong style={{ display: 'block', color: '#92400e', fontSize: '15px', marginBottom: '2px' }}>
                    Unauthorized Booking Role
                  </strong>
                  <span style={{ color: '#b45309', fontSize: '14px', lineHeight: 1.5 }}>
                    {roleError}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRoleError('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: '#92400e',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Available Rooms &amp; Rates</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                Select a room to begin reservation.
              </p>
            </div>
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

      {/* MODAL: PROMPT TENANT FOR GENDER IF MISSING */}
      {promptGenderModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: '#fef3c7',
                  color: '#d97706',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '32px' }}>wc</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Select Your Gender
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                {pg.gender === 'girls'
                  ? `${pg.title} is strictly a Girls Only accommodation. Please confirm your gender to verify booking eligibility.`
                  : 'Please confirm your gender to proceed with reservation.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { key: 'female', label: 'Female', icon: 'female' },
                { key: 'male', label: 'Male', icon: 'male' },
                { key: 'other', label: 'Other', icon: 'person' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedGenderChoice(opt.key)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: '10px',
                    border: selectedGenderChoice === opt.key ? '2px solid #ca8a04' : '1px solid #cbd5e1',
                    background: selectedGenderChoice === opt.key ? '#fffbeb' : '#fff',
                    color: selectedGenderChoice === opt.key ? '#b45309' : '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '24px' }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setPromptGenderModalOpen(false);
                  setPendingRoom(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={genderSaving}
                onClick={handleSaveMissingGender}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: genderSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                }}
              >
                {genderSaving ? 'Saving...' : 'Confirm & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
