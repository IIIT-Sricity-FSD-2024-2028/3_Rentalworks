import React from 'react';
import ListingCard from './ListingCard';

export default function ListingsGrid({ listings, onOpenFilters, onClearAll }) {
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
