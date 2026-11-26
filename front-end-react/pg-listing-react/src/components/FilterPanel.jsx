import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectFilters,
  selectFilterPanelOpen,
  setFilter,
  resetFilters,
  setFilterPanelOpen,
} from '../features/listings/listingsSlice';
import { AMENITIES } from '../utils/normalize';

/** Slide-in filter panel. All filter state lives in the `listings` slice. */
export default function FilterPanel() {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);
  const isOpen = useSelector(selectFilterPanelOpen);
  const onClose = React.useCallback(() => dispatch(setFilterPanelOpen(false)), [dispatch]);
  const onClear = () => dispatch(resetFilters());
  const onFilterChange = (key, value) => dispatch(setFilter({ key, value }));
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isOpen]);

  // Lock page scroll while the panel is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
            <h3>Filters</h3>
            <button id="closeFilter" aria-label="Close filters" onClick={onClose}>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>close</span>
            </button>
          </div>

          {/* SORT BY */}
          <div className="filter-section">
            <h4>Sort By</h4>
            <label><input type="radio" name="sort" value="low" checked={filters.sort === 'low'} onChange={handleRadioChange} /> Rent: low to high</label>
            <label><input type="radio" name="sort" value="high" checked={filters.sort === 'high'} onChange={handleRadioChange} /> Rent: high to low</label>
            <label><input type="radio" name="sort" value="beds" checked={filters.sort === 'beds'} onChange={handleRadioChange} /> Most beds free</label>
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
          </div>

          {/* AMENITIES */}
          <div className="filter-section">
            <h4>Amenities</h4>
            {Object.entries(AMENITIES).map(([key, { label }]) => (
              <label key={key}>
                <input type="checkbox" name="amenity" value={key} checked={filters.amenity.includes(key)} onChange={handleCheckboxChange} /> {label}
              </label>
            ))}
          </div>

          {/* AVAILABILITY */}
          <div className="filter-section">
            <h4>Availability</h4>
            <label>
              <input type="checkbox" checked={filters.availableOnly} onChange={(e) => onFilterChange('availableOnly', e.target.checked)} /> Only PGs with a free bed
            </label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="filter-actions">
            <button id="applyFilter" onClick={onClose}>Show results</button>
            <button id="clearFilter" onClick={onClear}>Clear all</button>
          </div>
        </div>
      </aside>
    </>
  );
}
