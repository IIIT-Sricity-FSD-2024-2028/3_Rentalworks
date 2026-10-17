import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="rentbro-unified-footer" style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      color: '#94a3b8',
      padding: '48px 24px 24px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '32px',
        marginBottom: '40px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>R</div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.5px' }}>
              RentBro
            </span>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#94a3b8' }}>
            Smart PG &amp; Hostel Rental Management Platform for tenants, property owners, and administrators.
          </p>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <li><Link to="/listings" style={{ color: '#94a3b8', textDecoration: 'none' }}>Find PGs &amp; Hostels</Link></li>
            <li><Link to="/my-bookings" style={{ color: '#94a3b8', textDecoration: 'none' }}>My Bookings</Link></li>
            <li><Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Portal Login</Link></li>
            <li><Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Register Account</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Portals</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <li><Link to="/tenant/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Tenant Portal</Link></li>
            <li><Link to="/owner" style={{ color: '#94a3b8', textDecoration: 'none' }}>Property Owner Portal</Link></li>
            <li><Link to="/warden/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Warden Portal</Link></li>
            <li><Link to="/admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin Operations</Link></li>
            <li><Link to="/super-admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>SuperAdmin Executive</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Support &amp; Security</h4>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#64748b' }}>
            Powered by Neon PostgreSQL backend &amp; Vite React SPA architecture with role-based JWT session controls.
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#38bdf8' }}>SSL Secured</span>
            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#4ade80' }}>24/7 Service</span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
        color: '#64748b'
      }}>
        <span>&copy; {new Date().getFullYear()} RentalWork / RentBro Inc. All rights reserved.</span>
        <span>Unified React SPA Architecture</span>
      </div>
    </footer>
  );
}
