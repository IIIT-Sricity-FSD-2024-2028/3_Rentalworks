import React from 'react';

/**
 * Reusable FilterBar component for tables, card feeds, and dashboards.
 * Provides status pill filters, live search with instant clear, and grid/table toggler.
 */
export default function FilterBar({
  title,
  count,
  filters = [],
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  viewMode,
  onViewModeChange,
  rightAction,
}) {
  return (
    <div className="panel-header-bar">
      <div className="panel-header-title">
        {title && <h2>{title}</h2>}
        {count !== undefined && <span className="panel-count-badge">{count}</span>}
      </div>

      <div className="panel-controls-right">
        {/* Status Filters */}
        {filters.length > 0 && (
          <div className="panel-filters-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                className={`filter-pill-btn ${activeFilter === f.key ? 'active' : ''}`}
                onClick={() => onFilterChange(f.key)}
                type="button"
              >
                {f.label} {f.count !== undefined ? `(${f.count})` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        {onSearchChange && (
          <div className="search-input-pill">
            <span
              className="material-icons-outlined"
              style={{ fontSize: '18px', color: 'var(--text-muted)' }}
            >
              search
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
                title="Clear search"
              >
                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            )}
          </div>
        )}

        {/* View Switcher (Grid vs Table) */}
        {onViewModeChange && viewMode && (
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid Card View"
              type="button"
            >
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                grid_view
              </span>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Table List View"
              type="button"
            >
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                view_list
              </span>
            </button>
          </div>
        )}

        {/* Optional Action Button */}
        {rightAction}
      </div>
    </div>
  );
}
