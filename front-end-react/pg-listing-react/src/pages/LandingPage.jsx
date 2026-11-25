import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, ROLE_HOME } from '../features/auth/authSlice';
import { fetchListings, selectAllListings, selectListingsError, selectListingsStatus } from '../features/listings/listingsSlice';
import { toastSuccess } from '../features/ui/uiSlice';
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

  const explore = listings.slice(0, 5);
  const newest = [...listings].sort((a, b) => b.id - a.id).slice(0, 4);
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
            <span className="material-icons-outlined">info</span>About
          </a>
          <a href="#feature">
            <span className="material-icons-outlined">flare</span>Feature
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
                {currentUser.name ? currentUser.name.split(' ')[0] : 'Dashboard'} (
                {currentUser.role?.toUpperCase() || 'GUEST'})
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
              Log-in / Register
            </button>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="home" className="hero">
        <div className="hero-text">
          <h1>Discover Your Next Home</h1>
          <p>Browse safe, affordable, and comfortable PG accommodation</p>
          <ul>
            <li>Secure and trusted platform</li>
            <li>{listings.length > 0 ? `${listings.length} verified properties listed` : 'Verified properties'}</li>
            <li>Fully secured</li>
          </ul>
          <button
            id="exploreBtn"
            className="neumorphic-btn"
            onClick={() => navigate('/listings')}
          >
            Explore Properties
          </button>
        </div>

        <div className="hero-img">
          <img src="/room_images/house.png" id="houseImg" alt="house" />
        </div>
      </section>

      {/* 3. EXPLORE SECTION */}
      <section id="about" className="explore">
        <h2 className="section-heading">Explore:</h2>
        <div className="explore-cards-grid">
          {explore.length === 0
            ? emptyState
            : explore.map((pg) => (
                <div key={pg.id} className="explore-card" onClick={() => navigate(`/pg/${pg.id}`)}>
                  <img src={pg.image} alt={pg.title} />
                  <h3 className="card-h3">{pg.title}</h3>
                  <p className="card-p">{pg.features[0].text}</p>
                  <strong>Rs. {pg.price.toLocaleString('en-IN')}</strong>
                </div>
              ))}
        </div>
      </section>

      {/* 4. NEW LISTINGS */}
      <section className="listings">
        <h2 className="section-heading">New Listings:</h2>
        <div className="new-listings-grid">
          {newest.length === 0
            ? emptyState
            : newest.map((pg) => (
                <div key={pg.id} className="listing-item" onClick={() => navigate(`/pg/${pg.id}`)}>
                  <img src={pg.image} alt={pg.title} />
                  <h3 className="title">{pg.title}</h3>
                  <div className="details-badges">
                    {pg.amenities.slice(0, 4).map((a) => (
                      <span key={a}>{a.toUpperCase()}</span>
                    ))}
                    {pg.safetyScore && <span>Safety: {pg.safetyScore}/10</span>}
                  </div>
                  <p className="location">
                    <span className="material-icons-outlined">location_on</span>
                    {pg.location}
                  </p>
                  <div className="price-row">
                    <span className="price">₹{pg.price.toLocaleString('en-IN')}/mo</span>
                    <button className="btn-view-pg">View Details</button>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* 5. OUR KEY FEATURES */}
      <section id="feature" className="features-section">
        <h2 className="section-heading">Our Key Features</h2>
        <div className="feature-grid">
          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">verified</span>
            </div>
            <h3>Verified PG Listings</h3>
            <p>
              Browse a wide range of verified PG accommodations listed by trusted property owners.
              Our platform ensures every listing is reliable, helping users find safe and comfortable
              living spaces.
            </p>
          </div>

          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">manage_search</span>
            </div>
            <h3>Smart Search &amp; Filters</h3>
            <p>
              Quickly discover PG accommodations using smart search and filtering options. Refine
              results based on location, price, amenities, and preferences.
            </p>
          </div>

          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">feed</span>
            </div>
            <h3>Detailed Property Info</h3>
            <p>
              Access complete property details including rent, facilities, room types, images, and
              location for better decision-making.
            </p>
          </div>

          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">star_rate</span>
            </div>
            <h3>Reviews &amp; Ratings</h3>
            <p>
              View real user reviews and ratings to understand quality, safety, and comfort before
              choosing a PG.
            </p>
          </div>

          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">chat</span>
            </div>
            <h3>Direct Owner Communication</h3>
            <p>
              Connect directly with property owners to ask questions, clarify details, and schedule
              visits easily.
            </p>
          </div>

          <div className="feature-box">
            <div className="icon-box">
              <span className="material-icons-outlined">add_home</span>
            </div>
            <h3>Easy Property Listing</h3>
            <p>
              Owners can list properties easily with details, images, and pricing to reach more
              potential tenants.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer id="contact" className="landing-footer">
        <div className="footer-container">
          {/* LEFT */}
          <div className="footer-left">
            <h4>Support</h4>
            {[
              ['Browse PGs', () => navigate('/listings')],
              ['About', () => scrollTo('about')],
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
            <h4>24/7 Customer Support</h4>
            <p>support@rentbro.com</p>
            <p>+91 92345 67810</p>
            <div className="social-icons">
              {[
                ['Facebook', 'thumb_up', 'https://www.facebook.com'],
                ['Instagram', 'photo_camera', 'https://www.instagram.com'],
                ['YouTube', 'play_circle', 'https://www.youtube.com'],
              ].map(([title, icon, href]) => (
                <a key={title} className="social-btn" title={title} href={href} target="_blank" rel="noreferrer">
                  <span className="material-icons-outlined" style={{ fontSize: '20px' }}>{icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="footer-right">
            <h4>Need help?</h4>
            <form onSubmit={handleHelpSubmit}>
              <textarea
                id="helpMsg"
                placeholder="Type your message here..."
                value={helpMsg}
                onChange={(e) => setHelpMsg(e.target.value)}
              />
              <br />
              <button id="helpSubmitBtn" type="submit" className="neumorphic-btn">
                Email Support
              </button>
            </form>
          </div>
        </div>

        <p className="copyright">@2026 RentBro. All Rights Reserved</p>
      </footer>
    </div>
  );
}
