import React from 'react';
import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'support@rentbro.com';

const linkStyle = { color: '#94a3b8', textDecoration: 'none' };
const listStyle = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' };
const headingStyle = { color: '#f8fafc', fontSize: '15px', fontWeight: 600, marginBottom: '16px' };

export default function Footer() {
  return (
    <footer
      className="rentbro-unified-footer"
      style={{ background: '#0f172a', color: '#94a3b8', padding: '40px 24px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
        }}
      >
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>RentBro</div>
          <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            Find a PG, book a bed and manage your stay in one place.
          </p>
        </div>

        <div>
          <h4 style={headingStyle}>For residents</h4>
          <ul style={listStyle}>
            <li><Link to="/listings" style={linkStyle}>Browse PGs</Link></li>
            <li><Link to="/my-bookings" style={linkStyle}>My bookings</Link></li>
            <li><Link to="/dashboard/tenant" style={linkStyle}>Tenant dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={headingStyle}>For owners &amp; staff</h4>
          <ul style={listStyle}>
            <li><Link to="/register" state={{ mode: 'owner' }} style={linkStyle}>List your PG</Link></li>
            <li><Link to="/login" style={linkStyle}>Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={headingStyle}>Contact</h4>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ ...linkStyle, fontSize: '14px' }}>{SUPPORT_EMAIL}</a>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: '#64748b' }}>
        © {new Date().getFullYear()} RentBro
      </div>
    </footer>
  );
}
