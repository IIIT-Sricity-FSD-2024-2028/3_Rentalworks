import React, { useState, useMemo, useEffect } from 'react';


const RAW_LISTINGS = [
  {
    id: 1,
    title: 'Sunrise PG Residency',
    location: 'Koramangala, Bangalore',
    price: 10000,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    room: 'double',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'unisex',
    distance: 1,
    amenities: ['wifi', 'ac', 'cctv', 'laundry'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'restaurant', text: 'With Food' },
      { icon: 'wifi', text: 'WiFi' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: 'Close to IT parks & metro'
  },
  {
    id: 2,
    title: 'Sri Sai Boys PG',
    location: 'Anna Nagar, Chennai',
    price: 7500,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80',
    room: 'double',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'boys',
    distance: 0.5,
    amenities: ['wifi', 'ac', 'geyser'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'restaurant', text: 'Veg + Non-Veg' },
      { icon: 'wifi', text: 'WiFi' }
    ],
    note: '500m from University'
  },
  {
    id: 3,
    title: 'Lakshmi Girls PG',
    location: 'Velachery, Chennai',
    price: 8500,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
    room: 'triple',
    food: 'food',
    foodtype: 'vegonly',
    gender: 'girls',
    distance: 1,
    amenities: ['wifi', 'ac', 'cctv'],
    features: [
      { icon: 'bed', text: 'Triple Sharing' },
      { icon: 'eco', text: 'Veg Only' },
      { icon: 'wifi', text: 'WiFi' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: 'Near Phoenix Mall'
  },
  {
    id: 4,
    title: 'Green Nest Co-Living',
    location: 'Koramangala, Bangalore',
    price: 12000,
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    room: 'single',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'unisex',
    distance: 1,
    amenities: ['wifi', 'ac', 'gym', 'laundry'],
    features: [
      { icon: 'bed', text: 'Single Sharing' },
      { icon: 'restaurant', text: 'With Food' },
      { icon: 'fitness_center', text: 'Gym' }
    ],
    note: 'Near shopping malls & metro'
  },
  {
    id: 5,
    title: 'Comfort Stay PG',
    location: 'T. Nagar, Chennai',
    price: 6500,
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80', // Replace placeholder with a valid image
    room: 'double',
    food: 'nofood',
    foodtype: 'nofood',
    gender: 'unisex',
    distance: 1,
    amenities: ['wifi'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'block', text: 'No Food' },
      { icon: 'wifi', text: 'WiFi' }
    ],
    note: '5 mins from Pondy Bazaar'
  },
  {
    id: 6,
    title: 'Royal Boys Hostel',
    location: 'BTM Layout, Bangalore',
    price: 9500,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
    room: 'single',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'boys',
    distance: 1,
    amenities: ['wifi', 'ac', 'parking'],
    features: [
      { icon: 'bed', text: 'Single Sharing' },
      { icon: 'restaurant', text: 'Veg + Non-Veg' },
      { icon: 'local_parking', text: 'Parking' }
    ],
    note: 'Near bus stand & metro'
  },
  {
    id: 7,
    title: 'Sunshine Girls PG',
    location: 'Porur, Chennai',
    price: 10500,
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&q=80',
    room: 'triple',
    food: 'food',
    foodtype: 'vegonly',
    gender: 'girls',
    distance: 1,
    amenities: ['wifi', 'ac', 'cctv', 'housekeeping'],
    features: [
      { icon: 'bed', text: 'Triple Sharing' },
      { icon: 'eco', text: 'Veg Only' },
      { icon: 'home', text: 'Housekeeping' }
    ],
    note: '3 km from IT Corridor'
  },
  {
    id: 8,
    title: 'Modern Living PG',
    location: 'Andheri, Mumbai',
    price: 11000,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=600&q=80',
    room: 'single',
    food: 'nofood',
    foodtype: 'nofood',
    gender: 'unisex',
    distance: 0.5,
    amenities: ['wifi', 'ac', 'gym', 'laundry', 'attached-bathroom'],
    features: [
      { icon: 'bed', text: 'Single Sharing' },
      { icon: 'block', text: 'Without Food' },
      { icon: 'fitness_center', text: 'Gym' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: 'Premium locality, fully furnished'
  },
  {
    id: 9,
    title: 'Venkateswara Boys PG',
    location: 'Porur, Chennai',
    price: 5500,
    rating: 4.1,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
    room: 'triple', // Or 'four'
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'boys',
    distance: 1,
    amenities: ['wifi', 'cctv'],
    features: [
      { icon: 'bed', text: 'Four Sharing' },
      { icon: 'restaurant', text: 'Veg + Non-Veg' },
      { icon: 'videocam', text: 'CCTV' }
    ],
    note: 'Near IT Parks & bus stop'
  },
  {
    id: 10,
    title: 'Premium Co-Living Space',
    location: 'Indiranagar, Bangalore',
    price: 13500,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=600&q=80',
    room: 'private',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'unisex',
    distance: 1,
    amenities: ['wifi', 'ac', 'gym', 'laundry', 'parking'],
    features: [
      { icon: 'bed', text: 'Private Room' },
      { icon: 'restaurant', text: 'With Food' },
      { icon: 'fitness_center', text: 'Gym' },
      { icon: 'local_parking', text: 'Parking' }
    ],
    note: '500m from IT corridor/offices'
  },
  {
    id: 11,
    title: 'Meenakshi Girls PG',
    location: 'Guindy, Chennai',
    price: 7000,
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80',
    room: 'double',
    food: 'food',
    foodtype: 'vegonly',
    gender: 'girls',
    distance: 1,
    amenities: ['wifi', 'geyser', 'housekeeping'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'eco', text: 'Veg Only' },
      { icon: 'shower', text: 'Geyser' }
    ],
    note: 'Close to Anna University gates'
  },
  {
    id: 12,
    title: 'Elite Boys PG',
    location: 'Marathahalli, Bangalore',
    price: 8000,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80',
    room: 'triple',
    food: 'nofood',
    foodtype: 'nofood',
    gender: 'boys',
    distance: 3,
    amenities: ['wifi', 'ac', 'cctv', 'parking'],
    features: [
      { icon: 'bed', text: 'Triple Sharing' },
      { icon: 'block', text: 'Without Food' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: '3km from Outer Ring Road bridge'
  },
  {
    id: 13,
    title: 'Balaji Mens Hostel',
    location: 'Velachery, Chennai',
    price: 4500,
    rating: 3.7,
    image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80',
    room: 'triple', // mapped to four
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'boys',
    distance: 1,
    amenities: ['wifi'],
    features: [
      { icon: 'bed', text: 'Four Sharing' },
      { icon: 'restaurant', text: 'Veg + Non-Veg' },
      { icon: 'wifi', text: 'WiFi' }
    ],
    note: 'Budget-friendly near TASMAC'
  }
];

const initialFilters = {
  sort: '',
  price: '',
  rating: '',
  distance: '',
  deposit: '',
  room: [],
  gender: [],
  food: [],
  amenity: []
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCity, setActiveCity] = useState('All');
  const [filters, setFilters] = useState(initialFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Helper to parse price range
  const parsePriceRange = (val) => {
    const [min, max] = val.split('-').map(Number);
    return { min, max };
  };

  const filteredListings = useMemo(() => {
    let result = RAW_LISTINGS.filter(card => {
      let show = true;
      const lowerSearch = searchQuery.toLowerCase().trim();
      const lowerCity = activeCity.toLowerCase();

      // SEARCH
      if (lowerSearch && !(card.title.toLowerCase().includes(lowerSearch) || card.location.toLowerCase().includes(lowerSearch))) {
        show = false;
      }

      // CITY
      if (lowerCity !== 'all' && !card.location.toLowerCase().includes(lowerCity)) {
        show = false;
      }

      // PRICE
      if (filters.price) {
        const { min, max } = parsePriceRange(filters.price);
        if (card.price < min || (max && card.price > max)) show = false;
      }

      // ROOM TYPE
      if (filters.room.length && !filters.room.includes(card.room)) {
        show = false;
      }

      // FOOD
      if (filters.food.length) {
        const foodMatch = filters.food.some(f => {
          if (f === 'food') return card.food === 'food';
          if (f === 'nofood') return card.food === 'nofood';
          if (f === 'vegonly') return card.foodtype === 'vegonly';
          if (f === 'vegnonveg') return card.foodtype === 'vegnonveg';
          return false;
        });
        if (!foodMatch) show = false;
      }

      // GENDER
      if (filters.gender.length && !filters.gender.includes(card.gender)) {
        show = false;
      }

      // AMENITIES
      if (filters.amenity.length) {
        const allPresent = filters.amenity.every(a => card.amenities.includes(a));
        if (!allPresent) show = false;
      }

      // DISTANCE
      if (filters.distance && card.distance > parseFloat(filters.distance)) {
        show = false;
      }

      // RATING
      if (filters.rating && card.rating < parseFloat(filters.rating)) {
        show = false;
      }

      return show;
    });

    // SORTING
    if (filters.sort && result.length > 1) {
      result.sort((a, b) => {
        if (filters.sort === 'low') return a.price - b.price;
        if (filters.sort === 'high') return b.price - a.price;
        if (filters.sort === 'rating') return b.rating - a.rating;
        return 0;
      });
    }

    return result;
  }, [searchQuery, activeCity, filters]);

  // Derive Active Chips
  const activeChips = useMemo(() => {
    const chips = [];
    const labels = {
      sort: { low: "Price: Low→High", high: "Price: High→Low", rating: "Highest Rated" },
      price: { "0-5000": "Under ₹5K", "5000-8000": "₹5K–₹8K", "8000-99999": "₹8K+" },
      rating: { "4.5": "4.5+ Stars", "4": "4+ Stars", "3": "3+ Stars" },
      distance: { "0.5": "Within 500m", "1": "Within 1km", "3": "Within 3km" },
      room: { single: "Single", double: "Double", triple: "Triple", private: "Private" },
      gender: { boys: "Boys", girls: "Girls", unisex: "Co-living/Unisex" },
      food: { food: "With Food", nofood: "Without Food", vegonly: "Veg Only", vegnonveg: "Veg+Non-Veg" },
      amenity: {
        wifi: "WiFi", ac: "AC", parking: "Parking", gym: "Gym", laundry: "Laundry",
        housekeeping: "Housekeeping", "attached-bathroom": "Attached Bath",
        cctv: "CCTV", geyser: "Geyser"
      }
    };

    if (searchQuery) chips.push({ label: `"${searchQuery}"`, key: 'search' });
    if (activeCity !== 'All') chips.push({ label: activeCity, key: 'city' });
    if (filters.sort) chips.push({ label: labels.sort[filters.sort], key: 'sort' });
    if (filters.price) chips.push({ label: labels.price[filters.price], key: 'price' });
    if (filters.rating) chips.push({ label: labels.rating[filters.rating], key: 'rating' });
    if (filters.distance) chips.push({ label: labels.distance[filters.distance], key: 'distance' });

    ['room', 'gender', 'food', 'amenity'].forEach(category => {
      filters[category].forEach(val => {
        chips.push({ label: labels[category][val], key: category, value: val });
      });
    });

    return chips;
  }, [searchQuery, activeCity, filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveCity('All');
    setFilters(initialFilters);
  };

  const handleRemoveChip = (key, value) => {
    if (key === 'search') setSearchQuery('');
    else if (key === 'city') setActiveCity('All');
    else if (['sort', 'price', 'rating', 'distance'].includes(key)) {
      setFilters(prev => ({ ...prev, [key]: '' }));
    }
    else {
      setFilters(prev => ({
        ...prev,
        [key]: prev[key].filter(v => v !== value)
      }));
    }
  };

  return (
    <div>
      <Header
        searchQuery={searchQuery}
        activeCity={activeCity}
        onSearchChange={setSearchQuery}
        onCityChange={setActiveCity}
      />

      <FilterPanel
        filters={filters}
        isOpen={isFilterPanelOpen}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      <ActiveFiltersBar
        activeChips={activeChips}
        onRemoveChip={handleRemoveChip}
      />

      <ListingsGrid
        listings={filteredListings}
        onOpenFilters={() => setIsFilterPanelOpen(true)}
        onClearAll={handleClearFilters}
      />
    </div>
  );
}


function ActiveFiltersBar({ activeChips, onRemoveChip }) {
  if (activeChips.length === 0) {
    return null;
  }

  return (
    <div id="activeFiltersBar" className="active-filters-bar" style={{ display: 'flex' }}>
      <span className="chips-label">Active:</span>
      <div id="activeChips" className="chips-container">
        {activeChips.map((chip, idx) => (
          <span key={idx} className="filter-chip" onClick={() => onRemoveChip(chip.key, chip.value)}>
            {chip.label} <span className="chip-remove">✕</span>
          </span>
        ))}
      </div>
    </div>
  );
}


function FilterPanel({ filters, isOpen, onFilterChange, onClear, onClose }) {
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

function Header({ searchQuery, activeCity, onSearchChange, onCityChange }) {
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

function ListingCard({ listing, isDisabled }) {
  const { title, location, price, rating, features, note, image } = listing;

  const cardStyle = isDisabled ? {
    opacity: '0.6',
    pointerEvents: 'none'
  } : { cursor: 'pointer' };

  return (
    <div className="listing-card" style={cardStyle} onClick={() => window.location.href = '#'}>
      <div className="image-box">
        <img src={image} alt={title} loading="lazy" />
        <span className="badge badge-rating">
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>star</span> {rating}
        </span>
      </div>
      <div className="listing-content">
        <h3>{title}</h3>
        <p className="location">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>location_on</span>
          {location}
        </p>
        <div className="price">₹{price.toLocaleString()} <span>/month</span></div>
        <div className="features">
          {features.map((feature, idx) => (
            <span key={idx} className="tag">
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>{feature.icon}</span>
              {feature.text}
            </span>
          ))}
        </div>
        <p className="note">{note}</p>
        <button
          className="view-btn"
          style={isDisabled ? { background: '#e2e8f0', color: '#64748b', boxShadow: 'none' } : {}}
        >
          {isDisabled ? 'Currently Unavailable' : 'View Details'}
        </button>
      </div>
    </div>
  );
}


function ListingsGrid({ listings, onOpenFilters, onClearAll }) {
  return (
    <main className="main-content">
      {/* TOP BAR */}
      <div className="content-header">
        <div>
          <h2>Available PGs</h2>
          <p id="resultCount" className="result-count">
            {listings.length === 1 ? '1 property found' : `${listings.length} properties found`}
          </p>
        </div>
        <button className="filter-btn" onClick={onOpenFilters}>
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>tune</span>
          Filters &amp; Sort
        </button>
      </div>

      {listings.length > 0 ? (
        <div className="listings-grid" id="listingsGrid" style={{ display: 'grid' }}>
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isDisabled={listing.title !== 'Sunrise PG Residency'}
            />
          ))}
        </div>
      ) : (
        <div id="emptyState" className="empty-state" style={{ display: 'block' }}>
          <div className="empty-icon"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>home</span></div>
          <h3>No PGs found</h3>
          <p>Try adjusting your search or filters.</p>
          <button id="resetAll" onClick={onClearAll}>Clear All Filters</button>
        </div>
      )}
    </main>
  );
}

export default App;

/*  1. Selected Feature
Feature/Page Selected: PG Listing Page (Search & Filter functionality). Files Converted: We converted the vanilla HTML/JS implementation of the PG Listing page into a modular React application (pg-listing-react).

REACT IMPLEMENTATION :
 React modernizes the search and filter functionality by moving from imperative DOM manipulation to a declarative state-driven model.
- State Management: All UI states (search text, selected city, and deep filters like amenities or price) are tracked using `useState` hooks inside the root component.
- Dynamic Filtering: Instead of manually hiding/showing HTML elements, we use the `useMemo` hook to dynamically compute a `filteredListings` array from the raw JSON data. 
- Reactivity: Whenever a user interacts with the UI (e.g., clicking a city or typing a search), a callback function updates the state. React detects this change, automatically re-runs the filter logic, and efficiently re-renders the component tree to display the updated listings.

2. Component Structure
The component hierarchy inside src/App.jsx is represented below, along with the callbacks used:

src/
└── App.jsx
    └── App (Root: Holds lifted state)
        ├── Header (Callbacks used: onSearchChange, onCityChange)
        ├── FilterPanel (Callbacks used: onFilterChange, onClear, onClose)
        ├── ActiveFiltersBar (Callbacks used: onRemoveChip)
        └── ListingsGrid (Callbacks used: onOpenFilters, onClearAll)
            └── ListingCard (Receives listing data as props)

3. Lifted State (Identifying Shared Data)
Where it is present: src/App.jsx

In the original JavaScript, state was scattered across DOM elements. In our React conversion, we identified that the Search Query, Active City, and Deep Filters (Amenities, Price, etc.) are "shared data".

Why? Because the Header needs to know the search query, the FilterPanel needs to know the deep filters, and the ListingsGrid needs to know all of them combined to render the correct cards.

To solve this, we lifted the state up to the App component:


const [searchQuery, setSearchQuery] = useState('');
const [activeCity, setActiveCity] = useState('All');
const [filters, setFilters] = useState(initialFilters);
const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
App.jsx now uses this lifted state to dynamically compute a filteredListings array using useMemo().

4. Props (Passing Data)
Where it is present: Passed from App.jsx to all child components.

We used props to pass the lifted state and raw data downwards from App to the UI components so they know what to display:

To Header: searchQuery={searchQuery} and activeCity={activeCity}.
To FilterPanel: filters={filters} and isOpen={isFilterPanelOpen}.
To ListingsGrid: listings={filteredListings} (the computed result of the active state).
To ListingCard: listing={listing} (the individual object containing the title, price, and image).

5. Callback Functions (Child-to-Parent Communication)
Where it is present: Defined in App.jsx and triggered from Header.jsx, FilterPanel.jsx, and ActiveFiltersBar.jsx.

Since state is lifted to App, the child components cannot modify it directly. We implemented callback functions to allow child-to-parent communication:

onSearchChange & onCityChange (in Header.jsx) When the user types in the search box, Header calls onSearchChange(e.target.value). This triggers setSearchQuery back up in App.jsx.

onFilterChange (in FilterPanel.jsx) When a user clicks the "WiFi" checkbox, the child calls onFilterChange('amenity', ['wifi']). App.jsx catches this and updates the complex filters object.

onRemoveChip (in ActiveFiltersBar.jsx) When a user clicks the "✕" on a filter chip, the child calls onRemoveChip('amenity', 'wifi'), telling App.jsx to remove that specific item from the lifted state.

*/
