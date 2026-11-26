import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOccupancyReport, syncBedCounts } from '../../../features/warden/wardenSlices';
import { toastError, toastSuccess } from '../../../features/ui/uiSlice';

const box = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 };
const warn = { background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginTop: 12, fontSize: 14, color: '#78350f' };
const bad = { ...warn, background: '#fef2f2', borderColor: '#fca5a5', color: '#7f1d1d' };

/**
 * Beds per PG counted from active stays (real residents), plus anything that
 * doesn't add up: rooms whose stored count is wrong (fixable here), rooms with
 * more people than beds, and tenant accounts with no bed or several beds.
 */
export default function BedSyncPanel({ compact = false }) {
  const dispatch = useDispatch();
  const report = useSelector(selectOccupancyReport);
  const syncing = useSelector((s) => s.warden.syncing);

  if (!report.staysLoaded) return null;

  const fix = async () => {
    try {
      const n = await dispatch(syncBedCounts()).unwrap();
      dispatch(toastSuccess(n ? `Updated bed counts for ${n} room${n === 1 ? '' : 's'}` : 'Bed counts already match'));
    } catch (err) {
      dispatch(toastError(typeof err === 'string' ? err : 'Could not update bed counts'));
    }
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Beds by PG</h3>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {report.residents} resident{report.residents === 1 ? '' : 's'} in {report.totalBeds} beds · {report.freeBeds} free
        </span>
      </div>

      {!compact && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b', fontSize: 12 }}>
              <th style={{ padding: '6px 4px' }}>PG</th>
              <th style={{ padding: '6px 4px' }}>Rooms</th>
              <th style={{ padding: '6px 4px' }}>Residents</th>
              <th style={{ padding: '6px 4px' }}>Beds</th>
              <th style={{ padding: '6px 4px' }}>Free</th>
            </tr>
          </thead>
          <tbody>
            {report.properties.map((p) => (
              <tr key={p.propertyId} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 4px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '8px 4px' }}>{p.rooms}</td>
                <td style={{ padding: '8px 4px' }}>{p.residents}</td>
                <td style={{ padding: '8px 4px' }}>{p.beds}</td>
                <td style={{ padding: '8px 4px', color: p.free ? '#15803d' : '#b91c1c' }}>{p.free}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {report.outOfSync.length > 0 && (
        <div style={warn}>
          <strong>
            {report.outOfSync.length} room{report.outOfSync.length === 1 ? ' has' : 's have'} the wrong bed count.
          </strong>{' '}
          The public listing and booking use this count, so they currently show different numbers from your residents list.
          <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
            {report.outOfSync.map((r) => (
              <li key={r.id}>
                {r.propertyName} · Room {r.roomNumber}: stored {r.stored}, actually {r.actual} of {r.capacity}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-confirm" disabled={syncing} onClick={fix}>
            {syncing ? 'Updating…' : 'Update bed counts'}
          </button>
        </div>
      )}

      {report.overbooked.length > 0 && (
        <div style={bad}>
          <strong>More people than beds:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {report.overbooked.map((r) => (
              <li key={r.id}>
                {r.propertyName} · Room {r.roomNumber} ({r.capacity} bed{r.capacity === 1 ? '' : 's'}):{' '}
                {r.occupants.map((o) => `${o.tenantName}${o.bedNumber ? ` (${o.bedNumber})` : ''}`).join(', ')}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 6 }}>Move {report.overbooked.reduce((n, r) => n + r.actual - r.capacity, 0)} of them to a free bed, or end the extra stays.</div>
        </div>
      )}

      {(report.multiBedTenants.length > 0 || report.tenantsWithoutBed.length > 0) && !compact && (
        <div style={{ ...warn, background: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' }}>
          {report.multiBedTenants.map((t) => (
            <div key={t.id}>
              <strong>{t.name}</strong> holds {t.beds.length} beds: {t.beds.map((b) => `${b.propertyName} ${b.roomNumber}${b.bedNumber ? `/${b.bedNumber}` : ''}`).join(', ')}
            </div>
          ))}
          {report.tenantsWithoutBed.length > 0 && (
            <div>
              <strong>No bed assigned:</strong> {report.tenantsWithoutBed.map((t) => t.name).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
