import React from 'react';

/**
 * Reusable StatCard component matching the Rentalworks design system.
 * Directly references the legacy frontend styling with rich accents.
 */
export default function StatCard({
  label,
  value,
  subtext,
  icon,
  valueColor,
  trend,
  className = '',
  onClick,
}) {
  return (
    <div
      className={`stat-card ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="stat-label">
        <span>{label}</span>
        {icon && (
          <span className="stat-icon">
            {typeof icon === 'string' ? (
              <span className="material-icons-outlined" style={{ fontSize: '28px' }}>
                {icon}
              </span>
            ) : (
              icon
            )}
          </span>
        )}
      </div>

      <div className="stat-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>

      {(subtext || trend) && (
        <div className="stat-sub">
          {trend && <span className={`trend-tag ${trend.type || 'neutral'}`}>{trend.label}</span>}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
}
