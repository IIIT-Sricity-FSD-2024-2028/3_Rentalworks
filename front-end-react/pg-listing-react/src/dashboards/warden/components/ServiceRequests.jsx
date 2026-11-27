import React, { useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { wardenServiceRequests } from '../../../features/warden/wardenSlices';
import useAutoRefresh from '../../../hooks/useAutoRefresh';
import { formatINR, statusLabel } from '../../../utils/normalize';

const NEXT_ACTION = {
  pending: { label: 'Accept', status: 'scheduled' },
  scheduled: { label: 'Start', status: 'in_progress' },
  in_progress: { label: 'Complete', status: 'completed' },
};

export default function ServiceRequests() {
  const dispatch = useDispatch();
  const { items, status, error, mutating } = useSelector(wardenServiceRequests.selectors.selectSlice);
  const [property, setProperty] = useScreenState('');
  const [showClosed, setShowClosed] = useScreenState(false);
  const loading = status === 'loading';

  useEffect(() => {
    dispatch(wardenServiceRequests.thunks.fetchAll());
  }, [dispatch]);

  // Refresh the queue on focus and while it is open so new tenant requests appear.
  const refresh = () => {
    if (!loading && !mutating) dispatch(wardenServiceRequests.thunks.fetchAll());
  };
  useAutoRefresh(refresh, 15000);

  const properties = new Map(items.filter((r) => r.propertyId != null)
    .map((r) => [String(r.propertyId), r.property?.name || `PG #${r.propertyId}`]));
  const visible = items.filter((r) =>
    (!property || String(r.propertyId) === property)
    && (showClosed || NEXT_ACTION[r.status]));

  function advance(request, action) {
    runThunk(dispatch, wardenServiceRequests.thunks.updateItem({
      id: request.id,
      changes: { status: action.status },
    }), { success: (row) => row.billableFrom ? 'Service completed and queued for rent billing' :
      action.status === 'scheduled' ? 'Service request accepted' : 'Service request updated' });
  }

  return (
    <section className="warden-service-requests" aria-labelledby="service-requests-heading">
      <div className="section-header">
        <h2 id="service-requests-heading">Tenant Service Requests</h2>
        <p>Completing a paid service adds its charge to the tenant’s rent billing.</p>
      </div>
      <div className="filter-bar">
        <label htmlFor="service-request-property">Property</label>
        <select id="service-request-property" className="filter-select" value={property} onChange={(event) => setProperty(event.target.value)}>
          <option value="">All properties</option>
          {[...properties].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <label>
          <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} />
          {' '}Show closed requests
        </label>
        <button className="btn-update-status" type="button" onClick={refresh} disabled={loading || mutating}>Refresh</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Service</th><th>Tenant</th><th>Property / room</th><th>Notes</th><th>Charge</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {visible.map((request) => {
              const action = NEXT_ACTION[request.status];
              return (
                <tr key={request.id}>
                  <td>{request.serviceName}</td>
                  <td>{request.tenant?.name || `Tenant #${request.tenantId}`}</td>
                  <td>{request.property?.name || properties.get(String(request.propertyId)) || 'Unassigned'}{request.roomEntity?.roomNumber ? ` / ${request.roomEntity.roomNumber}` : ''}</td>
                  <td>{request.notes || request.description || '—'}</td>
                  <td>{formatINR(request.amount)}{request.pricingModel === 'per_kg' && ` · ${Number(request.quantity)} kg`}</td>
                  <td>{statusLabel(request.status)}</td>
                  <td>{action && <button className="btn-update-status" type="button" disabled={mutating || loading} onClick={() => advance(request, action)}>{action.label}</button>}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7}>{loading ? 'Loading service requests…' : 'No requests match this view.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
