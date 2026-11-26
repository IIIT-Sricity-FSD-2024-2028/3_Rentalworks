import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, ROLE_HOME } from '../features/auth/authSlice';
import { fetchListings, selectAllListings, selectListingsError, selectListingsStatus } from '../features/listings/listingsSlice';
import { toastSuccess } from '../features/ui/uiSlice';
import { formatINR } from '../utils/normalize';
import useAutoRefresh from '../hooks/useAutoRefresh';
import '../styles/landing.css';

const SUPPORT_EMAIL = 'support@rentbro.com';

export default function LandingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const listings = useSelector(selectAllListings);
  const listingsStatus = useSelector(selectListingsStatus);
  const listingsError = useSelector(selectListingsError);
  const [helpMsg, setHelpMsg] = useState('');

  useEffect(() => {
    dispatch(fetchListings());
  }, [dispatch]);
  useAutoRefresh(() => dispatch(fetchListings()));

  // "Available now": PGs with free beds first, cheapest first.
  const explore = [...listings]
    .sort((a, b) => Number(b.hasAvailableRooms) - Number(a.hasAvailableRooms) || a.price - b.price)
    .slice(0, 5);
  const newest = [...listings].sort((a, b) => b.id - a.id).slice(0, 4);
  const freeBeds = listings.reduce((n, l) => n + l.freeBeds, 0);
  const cities = [...new Set(listings.map((l) => l.city).filter(Boolean))];
  const listingsMessage =
    listingsStatus === 'failed'
      ? listingsError || 'Could not load properties right now.'
      : listingsStatus === 'succeeded'
        ? 'No properties are listed yet. Please check back soon.'
        : 'Loading properties…';

  const handleLogout = () => {
    dispatch(logout());
    dispatch(toastSuccess('You have been signed out'));
  };

  // There is no public support-ticket endpoint, so open the visitor's mail app.
  const handleHelpSubmit = (e) => {
    e.preventDefault();
    const message = helpMsg.trim();
    if (!message) return;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('RentBro support request')}&body=${encodeURIComponent(message)}`;
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const emptyState = (
    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: '#64748b' }}>
      <p>{listingsMessage}</p>
      {listingsStatus === 'failed' && (
        <button className="neumorphic-btn" style={{ marginTop: 12 }} onClick={() => dispatch(fetchListings())}>Retry</button>
      )}
    </div>
  );

  return (
    <div className="landing-page-root">
      {/* 1. NAVBAR */}
      <header className="landing-navbar">
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="material-icons-outlined" style={{ fontSize: '28px', color: '#b58900' }}>
            apartment
          </span>
          <span>RentBro</span>
        </div>

        <nav>
          <a href="#home">
            <span className="material-icons-outlined">home</span>Home
          </a>
          <a href="#about">
            <span className="material-icons-outlined">holiday_village</span>PGs
          </a>
          <a href="#feature">
            <span className="material-icons-outlined">flare</span>Features
          </a>
          <a href="#contact">
            <span className="material-icons-outlined">mail</span>Contact
          </a>
          <a
            href="#explore"
            onClick={(e) => {
              e.preventDefault();
              navigate('/listings');
            }}
          >
            <span className="material-icons-outlined">search</span>Browse PGs
          </a>
        </nav>

        <div className="nav-right">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="login-btn"
                onClick={() => navigate(ROLE_HOME[currentUser.role] || '/listings')}
                title="Go to your dashboard"
              >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  account_circle
                </span>
                {currentUser.name ? currentUser.name.split(' ')[0] : 'My account'}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Sign out"
              >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  logout
                </span>
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => navigate('/login')}>
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                person
              </span>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="home" className="hero">
        <div className="hero-text">
          <h1>Find a PG that has a bed for you</h1>
          <p>See rent, room types and free beds before you book.</p>
          {listings.length > 0 && (
            <ul>
              <li>{listings.length} PG{listings.length === 1 ? '' : 's'} listed{cities.length ? ` in ${cities.join(', ')}` : ''}</li>
              <li>{freeBeds > 0 ? `${freeBeds} bed${freeBeds === 1 ? '' : 's'} free right now` : 'All beds are taken right now'}</li>
              <li>Book and pay online</li>
            </ul>
          )}
          <button
            id="exploreBtn"
            className="neumorphic-btn"
            onClick={() => navigate('/listings')}
          >
            Browse PGs
          </button>
        </div>

        <div className="hero-img">
          <img src="/room_images/house.png" id="houseImg" alt="house" />
        </div>
      </section>

      {/* 3. EXPLORE SECTION */}
      <section id="about" className="explore">
        <h2 className="section-heading">Available now</h2>
        <div className="explore-cards-grid">
          {explore.length === 0
            ? emptyState
            : explore.map((pg) => (
                <div key={pg.id} className="explore-card" onClick={() => navigate(`/pg/${pg.id}`)}>
                  <img src={pg.image} alt={pg.title} />
                  <h3 className="card-h3">{pg.title}</h3>
                  <p className="card-p">{pg.location}</p>
                  <p className="card-p">{pg.availabilityText}</p>
                  {pg.price > 0 && <strong>{pg.rentMax > pg.price ? 'From ' : ''}{formatINR(pg.price)} / month</strong>}
                </div>
              ))}
        </div>
      </section>

      {/* 4. NEW LISTINGS */}
      <section className="listings">
        <h2 className="section-heading">Recently added</h2>
        <div className="new-listings-grid">
          {newest.length === 0
            ? emptyState
            : newest.map((pg) => (
                <div key={pg.id} className="listing-item" onClick={() => navigate(`/pg/${pg.id}`)}>
                  <img src={pg.image} alt={pg.title} />
                  <h3 className="title">{pg.title}</h3>
                  <div className="details-badges">
                    <span>{pg.genderLabel}</span>
                    {pg.amenityLabels.slice(0, 3).map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                  <p className="location">
                    <span className="material-icons-outlined">location_on</span>
                    {pg.location}
                  </p>
                  <div className="price-row">
                    <span className="price">{pg.price > 0 ? `${pg.rentMax > pg.price ? 'From ' : ''}${formatINR(pg.price)}/mo` : 'Rent not listed'}</span>
                    <button className="btn-view-pg">View</button>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* 5. OUR KEY FEATURES */}
      <section id="feature" className="features-section">
        <h2 className="section-heading">What you can do here</h2>
        <div className="feature-grid">
          {[
            ['event_available', 'See free beds', 'Each PG shows how many beds are free in every room. The count changes as soon as a bed is booked.'],
            ['manage_search', 'Filter by what matters', 'Narrow the list by area, rent, room type, girls/boys/co-living, food and amenities.'],
            ['people', 'Pick a roommate', 'For shared rooms, fill in your habits and choose from the people already staying there.'],
            ['payments', 'Book and pay online', "Pay the first month's rent and deposit online. Your bed is assigned right away."],
            ['receipt_long', 'Track rent and requests', 'Once you move in, see rent dues, raise complaints and request services from your dashboard.'],
            ['add_home', 'List your PG', 'Owners can add their PG and rooms, and wardens manage residents from their own dashboard.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="feature-box">
              <div className="icon-box">
                <span className="material-icons-outlined">{icon}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer id="contact" className="landing-footer">
        <div className="footer-container">
          {/* LEFT */}
          <div className="footer-left">
            <h4>RentBro</h4>
            {[
              ['Browse PGs', () => navigate('/listings')],
              ['Available now', () => scrollTo('about')],
              ['Features', () => scrollTo('feature')],
              ['List Your PG', () => navigate('/register', { state: { mode: 'owner' } })],
              ['Contact', () => { window.location.href = `mailto:${SUPPORT_EMAIL}`; }],
            ].map(([label, go]) => (
              <p key={label} role="link" tabIndex={0} style={{ cursor: 'pointer' }} onClick={go} onKeyDown={(e) => e.key === 'Enter' && go()}>
                {label}
              </p>
            ))}
          </div>

          {/* CENTER */}
          <div className="footer-center">
            <h4>Contact</h4>
            <p>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </div>

          {/* RIGHT */}
          <div className="footer-right">
            <h4>Ask us something</h4>
            <form onSubmit={handleHelpSubmit}>
              <textarea
                id="helpMsg"
                placeholder="Your question"
                value={helpMsg}
                onChange={(e) => setHelpMsg(e.target.value)}
              />
              <br />
              <button id="helpSubmitBtn" type="submit" className="neumorphic-btn">
                Send by email
              </button>
            </form>
          </div>
        </div>

        <p className="copyright">© {new Date().getFullYear()} RentBro</p>
      </footer>
    </div>
  );
}
