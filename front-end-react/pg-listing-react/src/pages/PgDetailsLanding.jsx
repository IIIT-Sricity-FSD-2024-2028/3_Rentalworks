import React, { useEffect } from 'react';
import useScreenState from '../app/useScreenState';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchListingById, selectListingDetail, selectListingFaqs } from '../features/listings/listingsSlice';
import HouseRules from '../components/HouseRules';
import SharingRents from '../components/SharingRents';
import { startBooking, checkGenderEligibility, isSingleRoom } from '../features/booking/bookingSlice';
import { selectCurrentUser, updateMyProfile, MANAGEMENT_ROLES } from '../features/auth/authSlice';
import { toastError } from '../features/ui/uiSlice';
import { amenityLabel, amenityIcon, formatINR } from '../utils/normalize';
import useAutoRefresh from '../hooks/useAutoRefresh';

export default function PgDetailsLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { listing, status, error } = useSelector(selectListingDetail);
  const faqs = useSelector(selectListingFaqs);

  const [expandedFaq, setExpandedFaq] = useScreenState(null);
  const [eligibilityError, setEligibilityError] = useScreenState('');
  const [roleError, setRoleError] = useScreenState('');
  const [promptGenderModalOpen, setPromptGenderModalOpen] = useScreenState(false);
  const [selectedGenderChoice, setSelectedGenderChoice] = useScreenState('female');
  const [genderSaving, setGenderSaving] = useScreenState(false);
  const [pendingRoomId, setPendingRoom] = useScreenState(null);

  useEffect(() => {
    dispatch(fetchListingById(id));
  }, [dispatch, id]);
  // Keep bed counts current if someone else books while this page is open.
  useAutoRefresh(() => dispatch(fetchListingById(id)));

  const loading = status === 'idle' || status === 'loading' || String(listing?.id ?? '') !== String(id) && status !== 'failed';
  const pg = listing;
  const displayRooms = pg?.rooms || [];
  const pendingRoom = displayRooms.find((room) => room.id === pendingRoomId);

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
      setPendingRoom(room.id);
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
        <h2 style={{ margin: '12px 0 6px' }}>This PG couldn't be loaded</h2>
        <p style={{ color: '#64748b', marginBottom: 20 }}>{error || 'Please try again.'}</p>
        <button className="btn-save" onClick={() => dispatch(fetchListingById(id))} style={{ marginRight: 8 }}>Retry</button>
        <button className="btn-save" onClick={() => navigate('/listings')}>Browse all PGs</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#4b5563', fontSize: '16px' }}>Loading…</p>
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
            {pg.verified && <span className="hero-chip hero-chip-verified">Verified</span>}
            <span className="hero-chip">{pg.genderLabel}</span>
            <span className={`hero-chip ${pg.availability === 'available' ? 'hero-chip-open' : 'hero-chip-full'}`}>
              {pg.availabilityText}
            </span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {pg.title}
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#facc15' }}>location_on</span>
              {pg.location}
            </span>
            {pg.price > 0 && (
              <>
                <span>•</span>
                <span style={{ fontWeight: 600 }}>
                  {formatINR(pg.price)}
                  {pg.rentMax > pg.price ? ` – ${formatINR(pg.rentMax)}` : ''} / month
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* STICKY IN-PAGE SUB-NAVBAR */}
      <div className="sticky-subnav">
        <div className="container" style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
          <a href="#About" className="subnav-link">About</a>
          <a href="#Amenities" className="subnav-link">Amenities</a>
          <a href="#Rooms" className="subnav-link highlight">Rooms</a>
          <a href="#FAQs" className="subnav-link">FAQs</a>
          <a href="#Contact" className="subnav-link">Contact</a>
        </div>
      </div>

      <div className="container page-content" style={{ maxWidth: '1140px', margin: '40px auto', padding: '0 24px' }}>
        {/* ABOUT SECTION */}
        <section className="detail-section" id="About">
          <h2 className="section-title">About</h2>
          <p className="section-text" style={{ lineHeight: 1.8, color: '#475569', fontSize: '16px', marginBottom: '24px' }}>
            {pg.about || `${pg.genderLabel} PG in ${pg.location}. The owner hasn't added a description yet.`}
          </p>
          {pg.hasRooms && (
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-number">{pg.freeBeds}</span>
                <span className="stat-desc">Beds available</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{pg.occupiedBeds} / {pg.totalBeds}</span>
                <span className="stat-desc">Beds taken</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{pg.roomCount}</span>
                <span className="stat-desc">Rooms</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{pg.price ? formatINR(pg.price) : '—'}</span>
                <span className="stat-desc">Lowest rent / month</span>
              </div>
            </div>
          )}
          <ul className="verification-list">
            <li className={pg.verification.docsVerified ? 'ok' : ''}>
              <span className="material-icons-outlined">{pg.verification.docsVerified ? 'check_circle' : 'schedule'}</span>
              Documents {pg.verification.docsVerified ? 'verified' : 'not verified yet'}
            </li>
            <li className={pg.verification.inspectionPassed ? 'ok' : ''}>
              <span className="material-icons-outlined">{pg.verification.inspectionPassed ? 'check_circle' : 'schedule'}</span>
              {pg.verification.inspectionPassed ? 'Inspection passed' : 'Inspection pending'}
            </li>
            <li className={pg.verification.fireSafety ? 'ok' : ''}>
              <span className="material-icons-outlined">{pg.verification.fireSafety ? 'check_circle' : 'schedule'}</span>
              Fire safety {pg.verification.fireSafety ? 'certified' : 'not confirmed'}
            </li>
          </ul>
        </section>

        {/* AMENITIES SECTION */}
        <section className="detail-section" id="Amenities" style={{ marginTop: '50px' }}>
          <h2 className="section-title">Amenities</h2>
          <div className="amenities-grid">
            {pg.amenities.length === 0 && <p style={{ color: '#64748b' }}>The owner hasn't listed any amenities yet.</p>}
            {pg.amenities.map((key, i) => (
              <div key={key} className="amenity-card">
                <div className="amenity-icon">
                  <span className="material-icons-outlined">{amenityIcon(key)}</span>
                </div>
                <strong>{pg.amenityLabels[i] || amenityLabel(key)}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* RENT BY ROOM SIZE */}
        {Object.values(pg.rentBySharing || {}).some(Boolean) && (
          <section className="detail-section" id="RentBySize" style={{ marginTop: '50px' }}>
            <h2 className="section-title">Rent by room size</h2>
            <SharingRents rents={pg.rentBySharing} />
          </section>
        )}

        {/* HOUSE RULES (from the owner's Policy page) */}
        <section className="detail-section" id="HouseRules" style={{ marginTop: '50px' }}>
          <h2 className="section-title">House rules</h2>
          <HouseRules rules={pg.houseRules} />
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
                    You can't book this PG
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
                    Use a tenant account to book
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
              <h2 className="section-title" style={{ margin: 0 }}>Rooms &amp; rent</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                {pg.freeBeds > 0
                  ? 'Choose a room with a free bed to book. Counts update as beds are taken.'
                  : pg.hasRooms
                    ? 'Every bed here is taken right now. This page updates when one frees up.'
                    : ''}
              </p>
            </div>
          </div>

          {displayRooms.length === 0 && (
            <p style={{ color: '#64748b', padding: '16px 0' }}>The owner hasn't added rooms for this PG yet, so it can't be booked online.</p>
          )}
          <div className="rooms-grid">
            {displayRooms.map((room, idx) => {
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
                      {room.underMaintenance ? 'Under maintenance' : room.available ? `${room.bedsLeft} bed${room.bedsLeft > 1 ? 's' : ''} free` : 'Full'}
                    </span>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        {room.type}{room.roomNumber ? ` · Room ${room.roomNumber}` : ''}
                      </h3>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: room.available ? '#ca8a04' : '#64748b', marginBottom: '8px' }}>
                      {formatINR(room.rent)}<span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/month</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                      Deposit {formatINR(room.deposit)}
                    </p>
                    <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                      {room.currentOccupancy} of {room.capacity} bed{room.capacity > 1 ? 's' : ''} taken
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
                      {room.available ? 'Book a bed' : 'Not available'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQS SECTION */}
        <section className="detail-section" id="FAQs" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Questions</h2>
          <div className="faqs-list">
            {faqs.map((faq, index) => (
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
          <h2 className="section-title">Contact</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                {pg.owner?.name ? `Owner: ${pg.owner.name}` : 'Owner details not available'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>
                {pg.owner ? (
                  <>
                    Email: <a href={`mailto:${pg.owner.email}`}>{pg.owner.email}</a>
                    {pg.owner.phone ? <> • Phone: <a href={`tel:${pg.owner.phone}`}>{pg.owner.phone}</a></> : null}
                  </>
                ) : "The owner hasn't shared contact details for this listing."}
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
              {displayRooms.some(r => r.available) ? 'Book a bed' : 'See rooms'}
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
                Your gender
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                {`${pg.title} is a ${pg.genderLabel.toLowerCase()} PG. Add your gender to your profile so we can check you can book here.`}
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
                {genderSaving ? 'Saving…' : 'Save and continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
