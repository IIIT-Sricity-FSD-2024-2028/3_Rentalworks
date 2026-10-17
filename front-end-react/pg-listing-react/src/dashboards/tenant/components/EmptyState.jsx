import React from 'react';

/**
 * Reusable EmptyState component matching the design language.
 */
export default function EmptyState({
  icon = 'inbox',
  title = 'No Records Found',
  subtitle = 'There are no items matching your criteria at this moment.',
  actionLabel,
  onAction,
  actionType = 'primary', // 'primary' | 'ghost'
}) {
  return (
    <div className="records-empty-box">
      <div className="records-empty-icon">
        <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
          {icon}
        </span>
      </div>
      <div className="records-empty-title">{title}</div>
      <div className="records-empty-subtitle">{subtitle}</div>
      {actionLabel && onAction && (
        <button
          className={`btn btn-${actionType} btn-sm`}
          style={{ marginTop: '16px' }}
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
