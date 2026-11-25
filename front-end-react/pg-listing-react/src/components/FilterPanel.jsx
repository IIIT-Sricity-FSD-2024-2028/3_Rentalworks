import React, { useEffect } from 'react';

export default function FilterPanel({ filters, isOpen, onFilterChange, onClear, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    let newArray = [...filters[name]];
    if (checked) {
      newArray.push(value);
    } else {
      newArray = newArray.filter(item => item !== value);
    }
    onFilterChange(name, newArray);
  };

  return (
    <>
      <div id="filterOverlay" className={isOpen ? 'active' : ''} onClick={onClose}></div>
      
      <aside id="filterPanel" className={`filter-panel ${isOpen ? 'active' : ''}`} role="dialog" aria-label="Filters">
        <div className="filter-box">
          <div className="filter-header">
            <h3>Filters &amp; Sort</h3>
            <button id="closeFilter" aria-label="Close filters" onClick={onClose}>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>close</span>
            </button>
          </div>

          {/* SORT BY */}
          <div className="filter-section">
            <h4>Sort By</h4>
            <label><input type="radio" name="sort" value="low" checked={filters.sort === 'low'} onChange={handleRadioChange} /> Price Low → High</label>
            <label><input type="radio" name="sort" value="high" checked={filters.sort === 'high'} onChange={handleRadioChange} /> Price High → Low</label>
            <label><input type="radio" name="sort" value="rating" checked={filters.sort === 'rating'} onChange={handleRadioChange} /> Highest Rated</label>
          </div>

          {/* PRICE RANGE */}
          <div className="filter-section">
            <h4>Price Range</h4>
            <label><input type="radio" name="price" value="0-5000" checked={filters.price === '0-5000'} onChange={handleRadioChange} /> ₹0 – ₹5,000</label>
            <label><input type="radio" name="price" value="5000-8000" checked={filters.price === '5000-8000'} onChange={handleRadioChange} /> ₹5,000 – ₹8,000</label>
            <label><input type="radio" name="price" value="8000-99999" checked={filters.price === '8000-99999'} onChange={handleRadioChange} /> ₹8,000+</label>
          </div>

          {/* ROOM TYPE */}
          <div className="filter-section">
            <h4>Room Type</h4>
            <label><input type="checkbox" name="room" value="single" checked={filters.room.includes('single')} onChange={handleCheckboxChange} /> Single Sharing</label>
            <label><input type="checkbox" name="room" value="double" checked={filters.room.includes('double')} onChange={handleCheckboxChange} /> Double Sharing</label>
            <label><input type="checkbox" name="room" value="triple" checked={filters.room.includes('triple')} onChange={handleCheckboxChange} /> Triple Sharing</label>
            <label><input type="checkbox" name="room" value="private" checked={filters.room.includes('private')} onChange={handleCheckboxChange} /> Private Room</label>
          </div>

          {/* GENDER PREFERENCE */}
          <div className="filter-section">
            <h4>Gender Preference</h4>
            <label><input type="checkbox" name="gender" value="boys" checked={filters.gender.includes('boys')} onChange={handleCheckboxChange} /> Boys PG</label>
            <label><input type="checkbox" name="gender" value="girls" checked={filters.gender.includes('girls')} onChange={handleCheckboxChange} /> Girls PG</label>
            <label><input type="checkbox" name="gender" value="unisex" checked={filters.gender.includes('unisex')} onChange={handleCheckboxChange} /> Unisex PG</label>
          </div>

          {/* FOOD */}
          <div className="filter-section">
            <h4>Food Availability</h4>
            <label><input type="checkbox" name="food" value="food" checked={filters.food.includes('food')} onChange={handleCheckboxChange} /> With Food</label>
            <label><input type="checkbox" name="food" value="nofood" checked={filters.food.includes('nofood')} onChange={handleCheckboxChange} /> Without Food</label>
            <label><input type="checkbox" name="food" value="vegonly" checked={filters.food.includes('vegonly')} onChange={handleCheckboxChange} /> Veg Only</label>
            <label><input type="checkbox" name="food" value="vegnonveg" checked={filters.food.includes('vegnonveg')} onChange={handleCheckboxChange} /> Veg + Non-Veg</label>
          </div>

          {/* AMENITIES */}
          <div className="filter-section">
            <h4>Amenities</h4>
            <label><input type="checkbox" name="amenity" value="wifi" checked={filters.amenity.includes('wifi')} onChange={handleCheckboxChange} /> WiFi</label>
            <label><input type="checkbox" name="amenity" value="ac" checked={filters.amenity.includes('ac')} onChange={handleCheckboxChange} /> AC</label>
            <label><input type="checkbox" name="amenity" value="parking" checked={filters.amenity.includes('parking')} onChange={handleCheckboxChange} /> Parking</label>
            <label><input type="checkbox" name="amenity" value="attached-bathroom" checked={filters.amenity.includes('attached-bathroom')} onChange={handleCheckboxChange} /> Attached Bathroom</label>
            <label><input type="checkbox" name="amenity" value="laundry" checked={filters.amenity.includes('laundry')} onChange={handleCheckboxChange} /> Laundry</label>
            <label><input type="checkbox" name="amenity" value="housekeeping" checked={filters.amenity.includes('housekeeping')} onChange={handleCheckboxChange} /> Housekeeping</label>
            <label><input type="checkbox" name="amenity" value="gym" checked={filters.amenity.includes('gym')} onChange={handleCheckboxChange} /> Gym</label>
            <label><input type="checkbox" name="amenity" value="cctv" checked={filters.amenity.includes('cctv')} onChange={handleCheckboxChange} /> CCTV Security</label>
            <label><input type="checkbox" name="amenity" value="geyser" checked={filters.amenity.includes('geyser')} onChange={handleCheckboxChange} /> Geyser</label>
          </div>

          {/* DISTANCE */}
          <div className="filter-section">
            <h4>Distance</h4>
            <label><input type="radio" name="distance" value="0.5" checked={filters.distance === '0.5'} onChange={handleRadioChange} /> Within 500m</label>
            <label><input type="radio" name="distance" value="1" checked={filters.distance === '1'} onChange={handleRadioChange} /> Within 1 km</label>
            <label><input type="radio" name="distance" value="3" checked={filters.distance === '3'} onChange={handleRadioChange} /> Within 3 km</label>
          </div>

          {/* DEPOSIT / ADVANCE */}
          <div className="filter-section">
            <h4>Deposit / Advance</h4>
            <label><input type="radio" name="deposit" value="none" checked={filters.deposit === 'none'} onChange={handleRadioChange} /> No Deposit</label>
            <label><input type="radio" name="deposit" value="low" checked={filters.deposit === 'low'} onChange={handleRadioChange} /> Low</label>
          </div>

          {/* RATINGS */}
          <div className="filter-section">
            <h4>Ratings</h4>
            <label><input type="radio" name="rating" value="4.5" checked={filters.rating === '4.5'} onChange={handleRadioChange} /> 4.5 &amp; above</label>
            <label><input type="radio" name="rating" value="4" checked={filters.rating === '4'} onChange={handleRadioChange} /> 4 &amp; above</label>
            <label><input type="radio" name="rating" value="3" checked={filters.rating === '3'} onChange={handleRadioChange} /> 3 &amp; above</label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="filter-actions">
            <button id="applyFilter" onClick={onClose}>Apply Filters</button>
            <button id="clearFilter" onClick={onClear}>Clear Filters</button>
          </div>
        </div>
      </aside>
    </>
  );
}
