import React from 'react';

/**
 * Reusable StatusBadge component with animated pulsating beacon.
 * Unifies badge styling across all dashboard entities (Complaints, Issues, Bookings, Payments, Services).
 */
export default function StatusBadge({ status, pulse = true, className = '', customLabel }) {
  const normStatus = (status || 'pending').toLowerCase().replace(/\s+/g, '_');

  // Map known statuses to visual variants
  const getVariant = (s) => {
    switch (s) {
      case 'open':
      case 'unresolved':
      case 'danger':
      case 'failed':
      case 'rejected':
        return 'open';
      case 'in_progress':
      case 'in progress':
      case 'pending':
      case 'scheduled':
      case 'processing':
        return 'in_progress';
      case 'resolved':
      case 'active':
      case 'verified':
      case 'paid':
      case 'completed':
      case 'confirmed':
      case 'approved':
        return 'resolved';
      default:
        return 'in_progress';
    }
  };

  const variant = getVariant(normStatus);
  const displayLabel = customLabel || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`status-badge-pill ${variant} ${className}`}>
      {pulse && <span className="pulse-dot"></span>}
      <span style={{ textTransform: 'capitalize' }}>{displayLabel}</span>
    </span>
  );
}
