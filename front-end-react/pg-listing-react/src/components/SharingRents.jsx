import React from 'react';
import { formatINR } from '../utils/normalize';

const SIZES = [
  ['single', 'Single'],
  ['double', 'Double'],
  ['triple', 'Triple'],
];

/** Monthly rent per bed by room size, e.g. "Single ₹12,000 · Double ₹8,500". Sizes not offered are left out. */
export default function SharingRents({ rents, compact = false }) {
  const offered = SIZES.filter(([key]) => rents?.[key]);
  if (!offered.length) return null;
  if (compact) {
    return (
      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
        {offered.map(([key, label]) => `${label} ${formatINR(rents[key])}`).join(' · ')}
      </p>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {offered.map(([key, label]) => (
        <div key={key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', minWidth: 150 }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label} {key === 'single' ? 'room' : 'sharing'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            {formatINR(rents[key])}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}> / bed / month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
