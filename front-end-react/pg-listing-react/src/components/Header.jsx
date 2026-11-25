import React from 'react';

export default function Header({ searchQuery, activeCity, onSearchChange, onCityChange }) {
  const cities = ['All', 'Chennai', 'Bangalore', 'Mumbai', 'Pune'];

  return (
    <header className="header">
      <a href="../index.html" className="back-link">
        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        Back
      </a>

      <div className="header-inner">
        <h1 className="header-title">Find Your <span>Perfect PG</span></h1>

        {/* SEARCH */}
        <div className="search-container">
          <span className="material-icons-outlined search-icon" style={{ fontSize: '20px' }}>search</span>
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Search PGs by location or name..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button id="searchBtn" onClick={() => onSearchChange(searchQuery)}>Search</button>
        </div>

        {/* CITY FILTER PILLS */}
        <div className="city-filters">
          {cities.map(city => (
            <button 
              key={city}
              className={`city-btn ${activeCity.toLowerCase() === city.toLowerCase() ? 'active' : ''}`}
              onClick={() => onCityChange(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
