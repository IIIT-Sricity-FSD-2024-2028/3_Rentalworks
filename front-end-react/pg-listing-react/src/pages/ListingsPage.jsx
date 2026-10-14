import React, { useState, useMemo, useEffect } from 'react';
import { RAW_LISTINGS } from '../data/listingsData';
import ListingCard from '../components/ListingCard';

const initialFilters = {
  price: 'all',
  gender: 'all',
  room: 'all',
  food: 'all',
  foodtype: 'all',
  distance: 'all',
  amenities: [],
  rating: 'all'
};

export default function ListingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCity, setActiveCity] = useState('All');
  const [filters, setFilters] = useState(initialFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [dbRooms, setDbRooms] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/rooms', {
      headers: { 'x-role': 'super_admin' }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setDbRooms(data);
      })
      .catch(() => {});
  }, []);

  const cities = ['All', 'Chennai', 'Bangalore', 'Mumbai', 'Pune'];

  const filteredListings = useMemo(() => {
    return RAW_LISTINGS.filter(item => {
      if (activeCity !== 'All' && !item.location.toLowerCase().includes(activeCity.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.gender !== 'all' && item.gender !== filters.gender && item.gender !== 'unisex') {
        return false;
      }
      if (filters.room !== 'all') {
        if (filters.room === 'single') {
          const pgDbRooms = dbRooms.filter(r => String(r.propertyId) === String(item.id) || String(r.property?.id) === String(item.id));
          if (pgDbRooms.length > 0) {
            const hasAvailableSingle = pgDbRooms.some(r => r.capacity === 1 && (r.currentOccupancy || 0) < 1 && r.status !== 'full');
            if (!hasAvailableSingle) return false;
          } else if (item.room !== 'single') {
            return false;
          }
        } else if (item.room !== filters.room) {
          return false;
        }
      }
      if (filters.food !== 'all' && item.food !== filters.food) {
        return false;
      }
      if (filters.rating !== 'all' && item.rating < parseFloat(filters.rating)) {
        return false;
      }
      if (filters.amenities.length > 0) {
        const hasAll = filters.amenities.every(a => item.amenities?.includes(a));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [searchQuery, activeCity, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters(initialFilters);
    setSearchQuery('');
    setActiveCity('All');
  };

  return (
    <div className="listings-page-container">
      <header className="header">
        <div className="header-inner">
          <h1 className="header-title">Find Your <span>Perfect PG</span></h1>
          <p style={{ color: '#4b5563', fontSize: '15px', marginBottom: '16px' }}>
            Verified student & professional paying guest accommodations with live availability
          </p>

          <div className="search-container">
            <span className="material-icons-outlined search-icon" style={{ fontSize: '20px' }}>search</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search PGs by location or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button id="searchBtn" onClick={() => {}}>Search</button>
          </div>

          <div className="city-filters">
            {cities.map(city => (
              <button
                key={city}
                className={`city-btn ${activeCity.toLowerCase() === city.toLowerCase() ? 'active' : ''}`}
                onClick={() => setActiveCity(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-header">
          <div>
            <h2>Available PGs</h2>
            <p className="result-count">
              {filteredListings.length === 1 ? '1 property found' : `${filteredListings.length} properties found`}
            </p>
          </div>
          <button className="filter-btn" onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}>
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>tune</span>
            Filters ({Object.values(filters).filter(v => v !== 'all' && (!Array.isArray(v) || v.length > 0)).length})
          </button>
        </div>

        {isFilterPanelOpen && (
          <div className="inline-filters-box" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Gender</label>
                <select className="filter-select" value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)}>
                  <option value="all">All</option>
                  <option value="unisex">Unisex</option>
                  <option value="boys">Boys Only</option>
                  <option value="girls">Girls Only</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Room Type</label>
                <select className="filter-select" value={filters.room} onChange={(e) => handleFilterChange('room', e.target.value)}>
                  <option value="all">All Sharing</option>
                  <option value="single">Single Room</option>
                  <option value="double">Double Sharing</option>
                  <option value="triple">Triple Sharing</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Food Facility</label>
                <select className="filter-select" value={filters.food} onChange={(e) => handleFilterChange('food', e.target.value)}>
                  <option value="all">Any</option>
                  <option value="food">With Food</option>
                  <option value="nofood">Without Food</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Min Rating</label>
                <select className="filter-select" value={filters.rating} onChange={(e) => handleFilterChange('rating', e.target.value)}>
                  <option value="all">Any Rating</option>
                  <option value="4.5">4.5 & above</option>
                  <option value="4">4.0 & above</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-nav-outline" onClick={handleClear}>Reset Filters</button>
              <button className="btn-nav-primary" onClick={() => setIsFilterPanelOpen(false)}>Done</button>
            </div>
          </div>
        )}

        {filteredListings.length > 0 ? (
          <div className="listings-grid">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isDisabled={false}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>home</span></div>
            <h3>No PGs found</h3>
            <p>Try adjusting your search criteria or filters.</p>
            <button className="btn-save" onClick={handleClear}>Clear All Filters</button>
          </div>
        )}
      </main>
    </div>
  );
}
