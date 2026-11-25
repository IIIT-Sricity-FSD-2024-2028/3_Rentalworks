import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RAW_FAQS } from '../data/faqs';
import { fetchListingById, selectListingDetail } from '../features/listings/listingsSlice';
import { startBooking, checkGenderEligibility, isSingleRoom } from '../features/booking/bookingSlice';
import { selectCurrentUser, updateMyProfile, MANAGEMENT_ROLES } from '../features/auth/authSlice';
import { toastError } from '../features/ui/uiSlice';

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
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { listing, status, error } = useSelector(selectListingDetail);

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [eligibilityError, setEligibilityError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [promptGenderModalOpen, setPromptGenderModalOpen] = useState(false);
  const [selectedGenderChoice, setSelectedGenderChoice] = useState('female');
  const [genderSaving, setGenderSaving] = useState(false);
  const [pendingRoom, setPendingRoom] = useState(null);

  useEffect(() => {
    dispatch(fetchListingById(id));
  }, [dispatch, id]);

  const loading = status === 'idle' || status === 'loading' || String(listing?.id ?? '') !== String(id) && status !== 'failed';
  const pg = listing
    ? {
        ...listing,
        safetyLabel: listing.gender === 'girls' ? 'Female Safety Score' : 'Safety Score',
        stats: {
          residents: listing.totalRooms ? `${listing.rooms.reduce((n, r) => n + r.currentOccupancy, 0)}` : '0',
          security: listing.gender === 'girls' ? '24/7 CCTV & Biometric' : '24/7 CCTV & Security',
          backup: listing.amenities.includes('backup') ? '100%' : '—',
        },
      }
    : null;
  const displayRooms = pg?.rooms || [];

  // After signing in, the login page sends the user back here with the room they picked.
  useEffect(() => {
    const resumeRoomId = location.state?.resumeRoomId;
    if (!pg || !currentUser || resumeRoomId == null) return;
    const room = displayRooms.find((r) => String(r.id) === String(resumeRoomId));
    navigate(location.pathname, { replace: true, state: null });
    if (room) checkAndProceedBooking(currentUser, room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg?.id, currentUser?.id]);

  const checkAndProceedBooking = (user, room) => {
    if (!room || !room.available) return;

    if (user && MANAGEMENT_ROLES.includes(String(user.role).toLowerCase())) {
      setRoleError(`Management accounts (${user.role.toUpperCase()}) cannot make tenant bookings. Please sign in with a guest or tenant account.`);
      return;
    }

    const eligibility = checkGenderEligibility(pg, user);
    if (eligibility.needsGender) {
      setPendingRoom(room);
      setSelectedGenderChoice(pg.gender === 'boys' ? 'male' : 'female');
      setPromptGenderModalOpen(true);
      return;
    }
    if (!eligibility.ok) {
      setEligibilityError(eligibility.message);
      document.getElementById('Rooms')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    dispatch(startBooking({ pg: { id: pg.id, title: pg.title, location: pg.location, image: pg.image, gender: pg.gender, price: pg.price }, room }));
    navigate(isSingleRoom(room) ? `/book/${pg.id}/review` : `/book/${pg.id}/roommate`);
  };

  const handleBookRoom = (room) => {
    if (!room || !room.available) return;
    setEligibilityError('');
    setRoleError('');

    if (!currentUser) {
      navigate('/login', { state: { from: `/pg/${pg.id}`, resumeRoomId: room.id } });
      return;
    }
    checkAndProceedBooking(currentUser, room);
  };

  const handleSaveMissingGender = async () => {
    setGenderSaving(true);
    try {
      const updated = await dispatch(updateMyProfile({ gender: selectedGenderChoice })).unwrap();
      setPromptGenderModalOpen(false);
      const roomToContinue = pendingRoom;
      setPendingRoom(null);
      if (roomToContinue) checkAndProceedBooking({ ...currentUser, ...updated, gender: selectedGenderChoice }, roomToContinue);
    } catch (err) {
      dispatch(toastError(typeof err === 'string' ? err : 'Could not save your gender. Please try again.'));
    } finally {
      setGenderSaving(false);
    }
  };

  if (!loading && (status === 'failed' || !pg)) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
        <span className="material-icons-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>home_work</span>
        <h2 style={{ margin: '12px 0 6px' }}>Property unavailable</h2>
        <p style={{ color: '#64748b', marginBottom: 20 }}>{error || 'This PG could not be loaded.'}</p>
        <button className="btn-save" onClick={() => dispatch(fetchListingById(id))} style={{ marginRight: 8 }}>Retry</button>
        <button className="btn-save" onClick={() => navigate('/listings')}>Browse all PGs</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#4b5563', fontSize: '16px' }}>Loading accommodation details...</p>
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
              ✓ {pg.compliance === 'Verified' ? 'Verified' : 'Listed'} Accommodation
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
              {pg.safetyScore ? `Safety ${pg.safetyScore}/10` : 'Newly listed'}
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
          <a href="#FAQs" className="subnav-link">FAQs</a>
          <a href="#Contact" className="subnav-link">Contact</a>
        </div>
      </div>

      <div className="container page-content" style={{ maxWidth: '1140px', margin: '40px auto', padding: '0 24px' }}>
        {/* ABOUT SECTION */}
        <section className="detail-section" id="About">
          <h2 className="section-title">About This Property</h2>
          <p className="section-text" style={{ lineHeight: 1.8, color: '#475569', fontSize: '16px', marginBottom: '24px' }}>
            {pg.about || `${pg.title} is a paying-guest accommodation in ${pg.location}. Browse the available rooms below and reserve your bed online.`}
          </p>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{pg.stats.residents}</span>
              <span className="stat-desc">Current Residents</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats.security}</span>
              <span className="stat-desc">Security &amp; Monitoring</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.stats.backup}</span>
              <span className="stat-desc">Power Backup</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{pg.safetyScore ? `${pg.safetyScore}/10` : '—'}</span>
              <span className="stat-desc">{pg.safetyLabel}</span>
            </div>
          </div>
        </section>

        {/* AMENITIES SECTION */}
        <section className="detail-section" id="Amenities" style={{ marginTop: '50px' }}>
          <h2 className="section-title">Included Amenities</h2>
          <div className="amenities-grid">
            {pg.amenities.length === 0 && <p style={{ color: '#64748b' }}>Amenity details have not been added yet.</p>}
            {pg.amenities.map((key, idx) => {
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Available Rooms &amp; Rates</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                Select a room to begin reservation. Real-time room availability is verified.
              </p>
            </div>
          </div>

          {displayRooms.length === 0 && (
            <p style={{ color: '#64748b', padding: '16px 0' }}>No rooms have been listed for this property yet. Please check back soon.</p>
          )}
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
                Managed by: {pg.owner?.name || 'RentBro Property Partner'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>
                {pg.owner ? (
                  <>
                    Email: <a href={`mailto:${pg.owner.email}`}>{pg.owner.email}</a>
                    {pg.owner.phone ? <> • Phone: <a href={`tel:${pg.owner.phone}`}>{pg.owner.phone}</a></> : null}
                  </>
                ) : 'Contact details are shared after booking.'}
              </p>
              <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                ✓ Official Registered Property on RentBro
              </p>
            </div>
            <button
              onClick={() => {
                const availableRoom = displayRooms.find(r => r.available);
                if (availableRoom) handleBookRoom(availableRoom);
                else document.getElementById('Rooms')?.scrollIntoView({ behavior: 'smooth' });
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
              {displayRooms.some(r => r.available) ? 'Reserve A Bed Now' : 'View Rooms'}
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
