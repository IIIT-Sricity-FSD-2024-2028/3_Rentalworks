import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import FilterPanel from '../components/FilterPanel';
import { RAW_LISTINGS } from '../data/listingsData';

const API_BASE = 'http://localhost:3000';

const initialFilters = {
  sort: 'low',
  price: 'all',
  room: [],
  gender: [],
  food: [],
  amenity: [],
  distance: 'all',
  deposit: 'all',
  rating: 'all'
};

const DEFAULT_IMAGES = [
  '/room_images/1h.jpg',
  '/room_images/2h.webp',
  '/room_images/3h.jpg',
  '/room_images/4h.webp',
  '/room_images/5h.webp',
  '/room_images/6h.webp',
  '/room_images/7h.webp',
  '/room_images/8h.jpg',
  '/room_images/9h.webp',
];

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCity = searchParams.get('city') || 'All';
  const urlSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeCity, setActiveCity] = useState(urlCity);
  const [filters, setFilters] = useState(initialFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [dbProperties, setDbProperties] = useState([]);
  const [dbRooms, setDbRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state to URL params
  useEffect(() => {
    const params = {};
    if (activeCity && activeCity !== 'All') params.city = activeCity;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    setSearchParams(params, { replace: true });
  }, [activeCity, searchQuery, setSearchParams]);

  // Fetch properties and rooms directly from Neon PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch(`${API_BASE}/properties`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/rooms`, { headers: { 'x-role': 'super_admin' } }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([propsData, roomsData]) => {
      if (!isMounted) return;
      if (Array.isArray(propsData) && propsData.length > 0) {
        setDbProperties(propsData);
      }
      if (Array.isArray(roomsData)) {
        setDbRooms(roomsData);
      }
      setIsLoading(false);
    }).catch(err => {
      console.warn('API error fetching listings:', err);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const cities = ['All', 'Chennai', 'Bangalore', 'Mumbai', 'Pune'];

  // Combine DB properties with fallback data if needed
  const combinedListings = useMemo(() => {
    if (dbProperties.length > 0) {
      return dbProperties.map((prop, idx) => {
        const propRooms = dbRooms.filter(r => String(r.propertyId) === String(prop.id) || String(r.property?.id) === String(prop.id));
        const lowestRoomRent = propRooms.length > 0 ? Math.min(...propRooms.map(r => Number(r.rent) || 99999)) : null;
        const effectivePrice = prop.rentMin || prop.monthlyRent || (lowestRoomRent !== 99999 && lowestRoomRent ? lowestRoomRent : 9000);
        const rating = prop.safetyScore ? parseFloat(prop.safetyScore) : (4.5 + (idx % 5) * 0.1);

        const fallback = RAW_LISTINGS.find(r => String(r.id) === String(prop.id)) || RAW_LISTINGS[idx % RAW_LISTINGS.length];
        const displayImage = (prop.images && prop.images[0]) || fallback?.image || DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];

        const amenitiesList = (prop.amenities && Array.isArray(prop.amenities) && prop.amenities.length > 0)
          ? prop.amenities.map(a => String(a).toLowerCase())
          : (fallback?.amenities || ['wifi', 'ac', 'cctv']);

        const hasAvailableRooms = propRooms.length > 0
          ? propRooms.some(r => (r.currentOccupancy || 0) < (r.capacity || 1) && r.status !== 'full')
          : true;

        const roomTypesList = propRooms.map(r => (r.roomType || (r.capacity === 1 ? 'single' : 'double')).toLowerCase());

        return {
          id: prop.id,
          title: prop.name || fallback?.title || `PG ${prop.id}`,
          location: prop.location || `${prop.city || 'Chennai'}, ${prop.state || 'Tamil Nadu'}`,
          price: Number(effectivePrice),
          rating: Number(rating.toFixed(1)),
          reviewsCount: fallback?.reviewsCount || (120 + prop.id * 15),
          image: displayImage,
          room: prop.rooms || (propRooms.some(r => r.capacity === 1) ? 'single' : 'double'),
          roomTypes: roomTypesList.length > 0 ? roomTypesList : ['single', 'double'],
          food: amenitiesList.includes('meals') || amenitiesList.includes('food') || amenitiesList.includes('mess') ? 'food' : 'nofood',
          foodtype: 'vegnonveg',
          gender: prop.gender || 'unisex',
          distance: 1.2,
          amenities: amenitiesList,
          features: [
            { icon: 'bed', text: prop.rooms || 'Single/Double' },
            { icon: 'verified_user', text: `Safety: ${prop.safetyScore || '9.2'}` },
            { icon: 'wifi', text: 'WiFi' },
            { icon: 'ac_unit', text: 'AC' }
          ],
          note: prop.compliance === 'Verified' ? 'Verified Accommodation • Inspection Passed' : 'Safe and comfortable PG',
          about: prop.description || fallback?.about,
          rooms: propRooms.length > 0 ? propRooms : (fallback?.rooms || []),
          hasAvailableRooms,
          isDisabled: !hasAvailableRooms && propRooms.length > 0,
        };
      });
    }
    // Fallback if DB returns no properties
    return RAW_LISTINGS.map(item => ({
      ...item,
      roomTypes: [item.room || 'double'],
      hasAvailableRooms: true,
      isDisabled: false,
    }));
  }, [dbProperties, dbRooms]);

  // Comprehensive Filter & Search Logic
  const filteredListings = useMemo(() => {
    let result = combinedListings.filter(item => {
      // 1. City Filter
      if (activeCity !== 'All') {
        const cityMatch = item.location.toLowerCase().includes(activeCity.toLowerCase());
        if (!cityMatch) return false;
      }

      // 2. Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 3. Price Filter
      if (filters.price && filters.price !== 'all') {
        const [min, max] = filters.price.split('-').map(Number);
        if (item.price < min) return false;
        if (max && item.price > max) return false;
      }

      // 4. Gender Filter
      if (filters.gender && filters.gender.length > 0) {
        const itemGender = (item.gender || 'unisex').toLowerCase();
        const match = filters.gender.some(g => g === itemGender || itemGender === 'unisex');
        if (!match) return false;
      }

      // 5. Room Type Filter
      if (filters.room && filters.room.length > 0) {
        const match = filters.room.some(r => item.roomTypes?.includes(r.toLowerCase()) || item.room?.toLowerCase().includes(r.toLowerCase()));
        if (!match) return false;
      }

      // 6. Food Filter
      if (filters.food && filters.food.length > 0) {
        const match = filters.food.some(f => item.food === f || (f === 'vegonly' && item.food === 'food'));
        if (!match) return false;
      }

      // 7. Amenities Filter
      if (filters.amenity && filters.amenity.length > 0) {
        const hasAll = filters.amenity.every(a => item.amenities?.some(amen => amen.includes(a)));
        if (!hasAll) return false;
      }

      // 8. Rating Filter
      if (filters.rating && filters.rating !== 'all') {
        if (item.rating < parseFloat(filters.rating)) return false;
      }

      return true;
    });

    // Sort Results
    if (filters.sort === 'low') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sort === 'high') {
      result.sort((a, b) => b.price - a.price);
    } else if (filters.sort === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [combinedListings, searchQuery, activeCity, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters(initialFilters);
    setSearchQuery('');
    setActiveCity('All');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.price !== 'all') count++;
    if (filters.gender.length > 0) count += filters.gender.length;
    if (filters.room.length > 0) count += filters.room.length;
    if (filters.food.length > 0) count += filters.food.length;
    if (filters.amenity.length > 0) count += filters.amenity.length;
    if (filters.rating !== 'all') count++;
    return count;
  }, [filters]);

  return (
    <div className="listings-page-container">
      {/* HEADER SECTION */}
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
              placeholder="Search PGs by location or name... e.g. 'Anna Nagar' or 'Sunrise PG'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', marginRight: '6px' }}
                title="Clear Search"
              >
                ✕
              </button>
            )}
            <button id="searchBtn">Search</button>
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

      {/* FILTER OVERLAY SIDEBAR */}
      <FilterPanel
        filters={filters}
        isOpen={isFilterPanelOpen}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      {/* MAIN LISTINGS CONTENT */}
      <main className="main-content">
        <div className="content-header">
          <div>
            <h2>Available PGs</h2>
            <p className="result-count">
              {isLoading ? (
                'Loading live properties from Neon database...'
              ) : filteredListings.length === 1 ? (
                '1 property found'
              ) : (
                `${filteredListings.length} properties found`
              )}
            </p>
          </div>
          <button className="filter-btn" onClick={() => setIsFilterPanelOpen(true)}>
            <span className="material-icons-outlined" style={{ fontSize: '22px' }}>tune</span>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeFilterCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Active filters:</span>
            {filters.price !== 'all' && (
              <span className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('price', 'all')}>
                Price: ₹{filters.price} ✕
              </span>
            )}
            {filters.gender.map(g => (
              <span key={g} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('gender', filters.gender.filter(x => x !== g))}>
                Gender: {g} ✕
              </span>
            ))}
            {filters.room.map(r => (
              <span key={r} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('room', filters.room.filter(x => x !== r))}>
                Room: {r} ✕
              </span>
            ))}
            {filters.amenity.map(a => (
              <span key={a} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('amenity', filters.amenity.filter(x => x !== a))}>
                {a} ✕
              </span>
            ))}
            {filters.rating !== 'all' && (
              <span className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('rating', 'all')}>
                Rating: {filters.rating}+ ✕
              </span>
            )}
            <button
              onClick={handleClear}
              style={{ background: 'transparent', border: 'none', color: '#b58900', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset All
            </button>
          </div>
        )}

        {/* LISTINGS GRID */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Fetching properties and rooms from Neon PostgreSQL...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="listings-grid">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isDisabled={listing.isDisabled}
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
