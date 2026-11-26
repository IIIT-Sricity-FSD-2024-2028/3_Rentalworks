import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ListingCard from '../components/ListingCard';
import FilterPanel from '../components/FilterPanel';
import {
<<<<<<< HEAD
  CITIES,
=======
  selectCities,
>>>>>>> redux-migration
  fetchListings,
  resetFilters,
  setCity,
  setFilter,
  setFilterPanelOpen,
  setSearch,
  selectActiveFilterCount,
  selectCity,
  selectFilteredListings,
  selectFilters,
  selectListingsError,
  selectListingsStatus,
  selectSearch,
} from '../features/listings/listingsSlice';
<<<<<<< HEAD
=======
import { amenityLabel } from '../utils/normalize';
import { GENDER_LABEL } from '../features/listings/listingMappers';
import useAutoRefresh from '../hooks/useAutoRefresh';

const PRICE_LABEL = { '0-5000': 'Under ₹5,000', '5000-8000': '₹5,000 – ₹8,000', '8000-99999': '₹8,000+' };
>>>>>>> redux-migration

export default function ListingsPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearch);
  const activeCity = useSelector(selectCity);
  const filteredListings = useSelector(selectFilteredListings);
  const activeFilterCount = useSelector(selectActiveFilterCount);
  const status = useSelector(selectListingsStatus);
  const error = useSelector(selectListingsError);
  const isLoading = status === 'idle' || status === 'loading';
<<<<<<< HEAD
  const cities = CITIES;
=======
  const cities = useSelector(selectCities);
>>>>>>> redux-migration

  // URL → store (once, so links like /listings?city=Chennai work)
  useEffect(() => {
    dispatch(setCity(searchParams.get('city') || 'All'));
    dispatch(setSearch(searchParams.get('search') || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // store → URL
  useEffect(() => {
    const params = {};
    if (activeCity && activeCity !== 'All') params.city = activeCity;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    setSearchParams(params, { replace: true });
  }, [activeCity, searchQuery, setSearchParams]);

<<<<<<< HEAD
  // Always load fresh availability when the page opens.
  useEffect(() => {
    dispatch(fetchListings());
  }, [dispatch]);
=======
  // Always load fresh availability when the page opens, then keep it current.
  useEffect(() => {
    dispatch(fetchListings());
  }, [dispatch]);
  useAutoRefresh(() => dispatch(fetchListings()));
>>>>>>> redux-migration

  const setSearchQuery = (v) => dispatch(setSearch(v));
  const setActiveCity = (v) => dispatch(setCity(v));
  const handleFilterChange = (key, value) => dispatch(setFilter({ key, value }));
  const handleClear = () => dispatch(resetFilters());

  return (
    <div className="listings-page-container">
      {/* HEADER SECTION */}
      <header className="header">
        <div className="header-inner">
          <h1 className="header-title">Find Your <span>Perfect PG</span></h1>
          <p style={{ color: '#4b5563', fontSize: '15px', marginBottom: '16px' }}>
            Compare rent, room types and free beds across PGs
          </p>

          <div className="search-container">
            <span className="material-icons-outlined search-icon" style={{ fontSize: '20px' }}>search</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search by area or PG name"
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
            <button id="searchBtn" type="button" onClick={() => document.querySelector('.listings-grid')?.scrollIntoView({ behavior: 'smooth' })}>Search</button>
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
      <FilterPanel />

      {/* MAIN LISTINGS CONTENT */}
      <main className="main-content">
        <div className="content-header">
          <div>
            <h2>PGs</h2>
            <p className="result-count">
              {isLoading ? (
<<<<<<< HEAD
                'Loading live availability...'
=======
                'Loading…'
>>>>>>> redux-migration
              ) : filteredListings.length === 1 ? (
                '1 property found'
              ) : (
                `${filteredListings.length} properties found`
              )}
            </p>
          </div>
          <button className="filter-btn" onClick={() => dispatch(setFilterPanelOpen(true))}>
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
                {PRICE_LABEL[filters.price] || filters.price} ✕
              </span>
            )}
            {filters.gender.map(g => (
              <span key={g} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('gender', filters.gender.filter(x => x !== g))}>
                {GENDER_LABEL[g]} ✕
              </span>
            ))}
            {filters.room.map(r => (
              <span key={r} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('room', filters.room.filter(x => x !== r))}>
                {r.charAt(0).toUpperCase() + r.slice(1)} room ✕
              </span>
            ))}
            {filters.amenity.map(a => (
              <span key={a} className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('amenity', filters.amenity.filter(x => x !== a))}>
                {amenityLabel(a)} ✕
              </span>
            ))}
            {filters.availableOnly && (
              <span className="tag" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => handleFilterChange('availableOnly', false)}>
                Free beds only ✕
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
<<<<<<< HEAD
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Fetching properties and rooms...</p>
=======
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Loading PGs…</p>
>>>>>>> redux-migration
          </div>
        ) : status === 'failed' ? (
          <div className="empty-state">
            <div className="empty-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>cloud_off</span></div>
            <h3>Could not load PGs</h3>
            <p>{error}</p>
            <button className="btn-save" onClick={() => dispatch(fetchListings())}>Retry</button>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="listings-grid">
            {filteredListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
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
