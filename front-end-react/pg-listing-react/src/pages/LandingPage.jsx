import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

const API_BASE = 'http://localhost:3000';

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [helpMsg, setHelpMsg] = useState('');
  const [helpSubmitted, setHelpSubmitted] = useState(false);
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);

  // Fetch real properties from Neon DB via backend
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/properties`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setFeaturedProperties(data.slice(0, 4));
        }
      })
      .catch((err) => {
        console.warn('Could not load properties from API:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingProps(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleHelpSubmit = (e) => {
    e.preventDefault();
    if (!helpMsg.trim()) return;
    setHelpSubmitted(true);
    setTimeout(() => {
      setHelpMsg('');
      setHelpSubmitted(false);
    }, 3000);
  };

  const getRoleDestination = (role) => {
    switch (role) {
      case 'tenant':
        return '/tenant/dashboard';
      case 'owner':
        return '/owner';
      case 'warden':
        return '/warden/dashboard';
      case 'admin':
        return '/admin';
      case 'super_admin':
        return '/super-admin';
      default:
        return '/listings';
    }
  };

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
                onClick={() => navigate(getRoleDestination(currentUser.role))}
                title="Go to your dashboard"
              >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  account_circle
                </span>
                {currentUser.name ? currentUser.name.split(' ')[0] : 'Dashboard'} (
                {currentUser.role?.toUpperCase() || 'GUEST'})
              </button>
              <button
                onClick={logout}
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
            <li>300+ listed properties</li>
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
          <div className="explore-card" onClick={() => navigate('/pg/1')}>
            <img src="/room_images/1h.jpg" alt="Sunrise PG Residency" />
            <h3 className="card-h3">Sunrise PG Residency</h3>
            <p className="card-p">Single/Double Sharing</p>
            <strong>Rs. 15,000</strong>
          </div>

          <div className="explore-card" onClick={() => navigate('/pg/2')}>
            <img src="/room_images/2h.webp" alt="Boys PG" />
            <h3 className="card-h3">Sri Sai Boys PG</h3>
            <p className="card-p">Single Room</p>
            <strong>Rs. 14,000</strong>
          </div>

          <div className="explore-card" onClick={() => navigate('/pg/4')}>
            <img src="/room_images/3h.jpg" alt="Urban Apartments" />
            <h3 className="card-h3">Green Nest Co-Living</h3>
            <p className="card-p">Private Room</p>
            <strong>Rs. 14,000</strong>
          </div>

          <div className="explore-card" onClick={() => navigate('/pg/3')}>
            <img src="/room_images/4h.webp" alt="Girls PG" />
            <h3 className="card-h3">Lakshmi Girls PG</h3>
            <p className="card-p">Triple Sharing</p>
            <strong>Rs. 19,000</strong>
          </div>

          <div className="explore-card" onClick={() => navigate('/pg/5')}>
            <img src="/room_images/5h.webp" alt="Budget PG" />
            <h3 className="card-h3">Royal Stay Premium PG</h3>
            <p className="card-p">Double Sharing</p>
            <strong>Rs. 13,000</strong>
          </div>
        </div>
      </section>

      {/* 4. NEW LISTINGS */}
      <section className="listings">
        <h2 className="section-heading">New Listings:</h2>
        <div className="new-listings-grid">
          {featuredProperties.length > 0 ? (
            featuredProperties.map((prop, idx) => {
              const imageMap = [
                '/room_images/6h.webp',
                '/room_images/7h.webp',
                '/room_images/8h.jpg',
                '/room_images/9h.webp',
              ];
              const displayImage =
                (prop.images && prop.images[0]) || imageMap[idx % imageMap.length];
              const rent = prop.rentMin || prop.monthlyRent || 12000;

              return (
                <div
                  key={prop.id}
                  className="listing-item"
                  onClick={() => navigate(`/pg/${prop.id}`)}
                >
                  <img src={displayImage} alt={prop.name} />
                  <h3 className="title">{prop.name}</h3>

                  <div className="details-badges">
                    {(prop.amenities || ['WiFi', 'AC', 'Mess']).slice(0, 4).map((amenity, i) => (
                      <span key={i}>{typeof amenity === 'string' ? amenity.toUpperCase() : 'AMENITY'}</span>
                    ))}
                    <span>Safety: {prop.safetyScore || '9.2'}/10</span>
                  </div>

                  <p className="location">
                    <span className="material-icons-outlined">location_on</span>
                    {prop.location || 'Bangalore'}
                  </p>

                  <div className="price-row">
                    <span className="price">₹{Number(rent).toLocaleString('en-IN')}/mo</span>
                    <button className="btn-view-pg">View Details</button>
                  </div>
                </div>
              );
            })
          ) : (
            <>
              {/* Default fallback cards matching original HTML */}
              <div className="listing-item" onClick={() => navigate('/pg/4')}>
                <img src="/room_images/6h.webp" alt="Luxury PG" />
                <h3 className="title">Luxury PG : Koramangala</h3>
                <div className="details-badges">
                  <span>Attached Kitchen</span>
                  <span>2 Bathrooms</span>
                  <span>Fully-furnished</span>
                  <span>WiFi</span>
                </div>
                <p className="location">
                  <span className="material-icons-outlined">location_on</span> Near Hospital,
                  Restaurants, Metro Station
                </p>
                <div className="price-row">
                  <span className="price">Rs. 22,000/month</span>
                  <button className="btn-view-pg">View Details</button>
                </div>
              </div>

              <div className="listing-item" onClick={() => navigate('/pg/2')}>
                <img src="/room_images/7h.webp" alt="Student Flat" />
                <h3 className="title">Student Flat : Near University</h3>
                <div className="details-badges">
                  <span>Shared Kitchen</span>
                  <span>2 Bathrooms</span>
                  <span>Semi-furnished</span>
                  <span>WiFi</span>
                </div>
                <p className="location">
                  <span className="material-icons-outlined">location_on</span> Near University,
                  Shopping Mall
                </p>
                <div className="price-row">
                  <span className="price">Rs. 12,000/month</span>
                  <button className="btn-view-pg">View Details</button>
                </div>
              </div>

              <div className="listing-item" onClick={() => navigate('/pg/1')}>
                <img src="/room_images/8h.jpg" alt="Working Professionals PG" />
                <h3 className="title">Working Professionals PG : BTM Layout</h3>
                <div className="details-badges">
                  <span>Shared Kitchen</span>
                  <span>3 Bathrooms</span>
                  <span>Fully-furnished</span>
                  <span>WiFi</span>
                </div>
                <p className="location">
                  <span className="material-icons-outlined">location_on</span> Near IT Park, Restaurants
                </p>
                <div className="price-row">
                  <span className="price">Rs. 28,000/month</span>
                  <button className="btn-view-pg">View Details</button>
                </div>
              </div>

              <div className="listing-item" onClick={() => navigate('/pg/5')}>
                <img src="/room_images/9h.webp" alt="Premium Flat" />
                <h3 className="title">Premium Flat : Indiranagar</h3>
                <div className="details-badges">
                  <span>Common Kitchen</span>
                  <span>2 Bathrooms</span>
                  <span>Fully-furnished</span>
                  <span>WiFi</span>
                </div>
                <p className="location">
                  <span className="material-icons-outlined">location_on</span> Near Metro Station, Restaurants
                </p>
                <div className="price-row">
                  <span className="price">Rs. 22,000/month</span>
                  <button className="btn-view-pg">View Details</button>
                </div>
              </div>
            </>
          )}
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
            <p>Blogs</p>
            <p>Plans</p>
            <p>About</p>
            <p>Pricing</p>
            <p>Contact</p>
            <div className="footer-small">
              <p>Privacy Policy</p>
              <p>Terms &amp; Conditions</p>
            </div>
          </div>

          {/* CENTER */}
          <div className="footer-center">
            <h4>24/7 Customer Support</h4>
            <p>support@rentbro.com</p>
            <p>+91 92345 67810</p>
            <div className="social-icons">
              <div className="social-btn" title="Facebook">
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  thumb_up
                </span>
              </div>
              <div className="social-btn" title="Instagram">
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  photo_camera
                </span>
              </div>
              <div className="social-btn" title="YouTube">
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                  play_circle
                </span>
              </div>
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
                {helpSubmitted ? 'Message Sent!' : 'Submit'}
              </button>
            </form>
            {helpSubmitted && (
              <p style={{ color: '#16a34a', fontSize: '13px', marginTop: '8px' }}>
                ✓ Thank you! Our support team will get back to you shortly.
              </p>
            )}
          </div>
        </div>

        <p className="copyright">@2026 RentBro. All Rights Reserved</p>
      </footer>
    </div>
  );
}
