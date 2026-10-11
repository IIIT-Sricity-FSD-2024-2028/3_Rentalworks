import React from 'react';

export default function ActiveFiltersBar({ activeChips, onRemoveChip }) {
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
