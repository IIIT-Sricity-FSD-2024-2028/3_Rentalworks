import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, setAuthModalOpen } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDetailsPage = location.pathname.startsWith('/pg/');
  const isListingPage = location.pathname === '/' || location.pathname === '/listings';

  return (
    <nav className="site-navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="brand-icon">
            <span className="material-icons-outlined">home</span>
          </span>
          <span className="brand-text">Sunrise PG Residency</span>
        </div>

        {isDetailsPage && (
          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li><a href="#About" onClick={() => setMobileMenuOpen(false)}>About</a></li>
            <li><a href="#Amenities" onClick={() => setMobileMenuOpen(false)}>Amenities</a></li>
            <li><a href="#Rooms" onClick={() => setMobileMenuOpen(false)}>Available Rooms</a></li>
            <li><a href="#Reviews" onClick={() => setMobileMenuOpen(false)}>Reviews</a></li>
            <li><a href="#FAQs" onClick={() => setMobileMenuOpen(false)}>FAQs</a></li>
            <li><a href="#Contact" onClick={() => setMobileMenuOpen(false)}>Contact Owner</a></li>
          </ul>
        )}

        <div className="nav-actions">
          {!isListingPage && (
            <button className="btn-nav-outline" onClick={() => navigate('/listings')}>
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              Listings
            </button>
          )}

          <button className="btn-nav-text" onClick={() => navigate('/my-bookings')}>
            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>assignment</span>
            My Bookings
          </button>

          {currentUser ? (
            <div className="user-profile-menu">
              <button
                className="user-profile-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Account Menu"
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=ca8a04&color=fff`}
                  alt="Avatar"
                  className="user-avatar"
                />
                <span className="user-name-short">{currentUser.name?.split(' ')[0] || 'User'}</span>
                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                  {dropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {dropdownOpen && (
                <div className="user-dropdown-popover">
                  <div className="dropdown-user-header">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.email}</span>
                    <span className="user-role-chip">{currentUser.role?.toUpperCase() || 'GUEST'}</span>
                  </div>
                  <hr />
                  <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/my-bookings'); }}>
                    <span className="material-icons-outlined">receipt_long</span> My Bookings
                  </button>
                  <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/transactions'); }}>
                    <span className="material-icons-outlined">payments</span> Transactions
                  </button>
                  <hr />
                  <button className="dropdown-item text-danger" onClick={() => { setDropdownOpen(false); logout(); }}>
                    <span className="material-icons-outlined">logout</span> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn-nav-primary" onClick={() => setAuthModalOpen(true)}>
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>login</span>
              Sign In
            </button>
          )}

          {isDetailsPage && (
            <button
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="material-icons-outlined">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
