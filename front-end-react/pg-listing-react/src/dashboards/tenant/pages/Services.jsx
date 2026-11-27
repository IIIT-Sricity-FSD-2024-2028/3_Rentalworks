import React, { useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { tenantServiceRequests } from '../../../features/tenant/tenantSlices';
import { services } from '../../../features/services/servicesSlice';
import { selectDefaultServices } from '../../../features/shared/catalogSlice';
import { toastError } from '../../../features/ui/uiSlice';
import { useTenant } from '../hooks/useTenant';
import useAutoRefresh from '../../../hooks/useAutoRefresh';
import { formatINR } from '../../../utils/normalize';

const PRICING = { per_kg: ' per kg', per_session: ' per session', per_month: '/month', monthly: '/month', per_use: ' per use' };
const ICONS = [
  [/laundry|wash/i, 'local_laundry_service', 'Laundry'],
  [/park/i, 'directions_car', 'Parking'],
  [/clean/i, 'cleaning_services', 'Cleaning'],
  [/pantry|kitchen|food|meal/i, 'coffee', 'Maintenance'],
];

/** Service row configured by the owner/admin → catalogue card. */
const mapService = (s) => {
  const price = s.pricingModel === 'included_in_rent' ? 0 : Number(s.price) || 0;
  const [, icon, type] = ICONS.find(([re]) => re.test(s.name)) || [null, 'build', s.name];
  return {
    id: s.id,
    name: s.name,
    type,
    price,
    pricingModel: s.pricingModel,
    priceLabel: price ? `₹${price}${PRICING[s.pricingModel] || ''}` : 'Included in rent',
    icon,
    description: s.description || [s.timing, s.location].filter(Boolean).join(' • ') || 'Available at your property',
  };
};

const Services = () => {
  const dispatch = useDispatch();
  const { activeBooking } = useTenant();
  const propertyId = activeBooking?.propertyId ?? activeBooking?.property?.id;

  const requests = useSelector(tenantServiceRequests.selectors.selectItems);
  const requestsLoading = useSelector(tenantServiceRequests.selectors.selectIsLoading);
  const error = useSelector(tenantServiceRequests.selectors.selectError);
  const submitting = useSelector(tenantServiceRequests.selectors.selectMutating);
  const propertyServices = useSelector(services.selectors.selectItems);
  const catalogStatus = useSelector(services.selectors.selectStatus);
  const catalogError = useSelector(services.selectors.selectError);
  const defaultCatalog = useSelector(selectDefaultServices);
  const loading = requestsLoading && requests.length === 0;

  // Services configured for this property, else the standard catalogue.
  const configured = propertyServices.filter((service) => String(service.propertyId) === String(propertyId));
  const catalog = !propertyId || catalogStatus !== 'succeeded' ? []
    : configured.length ? configured.filter((service) => service.isAvailable !== false).map(mapService) : defaultCatalog;

  // Modal State
  const [selectedServiceKey, setSelectedServiceKey] = useScreenState(null);
  const selectedService = catalog.find((service) => (service.id ?? service.name) === selectedServiceKey);
  const [notes, setNotes] = useScreenState('');
  const [quantity, setQuantity] = useScreenState('1');
  const byWeight = selectedService?.pricingModel === 'per_kg';
  const units = byWeight ? Number(quantity) : 1;
  const validQuantity = units >= 0.01 && units <= 1000 && (!byWeight || /^\d+(\.\d{1,2})?$/.test(quantity));
  const unitPriceInCents = Math.round((selectedService?.price ?? 0) * 100);
  const estimate = validQuantity ? Math.round(unitPriceInCents * units) / 100 : null;

  useEffect(() => {
    dispatch(tenantServiceRequests.thunks.fetchAll());
  }, [dispatch]);

  // Keep the tenant's status in sync when a warden updates the request.
  useAutoRefresh(() => {
    if (!requestsLoading && !submitting) dispatch(tenantServiceRequests.thunks.fetchAll());
  }, 15000);

  useEffect(() => {
    if (propertyId) dispatch(services.thunks.fetchAll(propertyId));
  }, [dispatch, propertyId]);

  const handleOpenModal = (service) => {
    if (!propertyId) {
      dispatch(toastError('You need an active stay to request services.'));
      return;
    }
    setSelectedServiceKey(service.id ?? service.name);
    setNotes('');
    setQuantity('1');
  };

  const handleCreateRequest = async (e) => {
    if (e) e.preventDefault();
    if (!selectedService || !validQuantity) return;
    const { ok } = await runThunk(
      dispatch,
      tenantServiceRequests.thunks.createItem({
        serviceType: selectedService.type,
        serviceName: selectedService.name,
        serviceId: selectedService.id,
        amount: estimate,
        quantity: units,
        description: notes.trim() || undefined,
        notes: notes.trim() || undefined,
        propertyId: Number(propertyId),
        roomId: activeBooking?.roomId ? Number(activeBooking.roomId) : undefined,
      }),
      { success: `${selectedService.name} requested` },
    );
    if (ok) setSelectedServiceKey(null);
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this service request?')) return;
    const { ok } = await runThunk(dispatch, tenantServiceRequests.thunks.removeItem(requestId), { success: 'Service request cancelled' });
    if (ok) dispatch(tenantServiceRequests.thunks.fetchAll());
  };

  const activeCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress' || r.status === 'scheduled',
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <h1>Services</h1>
        <p>Completed paid services are added to your rent bill. Track charges and receipts in Payments.</p>
      </div>

      <div className="grid-3 mb-20" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">
            Available Services{' '}
            <span>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                build
              </span>
            </span>
          </div>
          <div className="stat-value">{catalog.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Active Requests{' '}
            <span>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                schedule
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>
            {activeCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Completed{' '}
            <span>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                check_circle
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {completedCount}
          </div>
        </div>
      </div>

      <div className="card mb-20" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div className="card-title">My Service Requests</div>
          <div style={{ marginTop: '14px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading your service requests...</p>
            ) : error ? (
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            ) : requests.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  padding: '16px',
                }}
              >
                No active service requests. Choose a service below to request one!
              </div>
            ) : (
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Notes</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Requested At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.serviceName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Type: {req.serviceType}
                        </div>
                      </td>
                      <td>{req.description || req.notes || '-'}</td>
                      <td>
                        {formatINR(req.amount)}
                        {req.pricingModel === 'per_kg' && <small> · {Number(req.quantity)} kg</small>}
                        {req.billableFrom && <div><small>{req.rentDueId ? 'Paid with rent' : 'Awaiting rent payment'}</small></div>}
                      </td>
                      <td>
                        <span
                          className={`badge-${
                            req.status === 'completed'
                              ? 'active'
                              : req.status === 'in_progress'
                              ? 'warning'
                              : 'danger'
                          }`}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.requestedAt
                          ? new Date(req.requestedAt).toLocaleDateString()
                          : req.requestedDate || 'N/A'}
                      </td>
                      <td>
                        {['pending', 'scheduled', 'in_progress'].includes(req.status) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleCancelRequest(req.id)}
                            title="Cancel Request"
                          >
                            <span
                              className="material-icons-outlined"
                              style={{ fontSize: '18px' }}
                            >
                              cancel
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '14px' }}>Available Property Services</h3>
      {catalogError && <p role="alert">{catalogError}</p>}
      {catalog.length === 0 && !catalogError && (
        <p>{propertyId ? (catalogStatus === 'loading' ? 'Loading services…' : 'No services currently available.') : 'An active stay is required to request services.'}</p>
      )}
      <div className="grid-2">
        {catalog.map((service) => (
          <div className="service-card" key={service.name}>
            <div className="service-header">
              <span className="service-header-icon">
                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                  {service.icon}
                </span>
              </span>
              <div>
                <div className="service-header-title">{service.name}</div>
                <span className="service-available-badge">Available</span>
              </div>
            </div>
            <div className="service-body">
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                }}
              >
                {service.description}
              </p>
              <div className="service-price-bar">
                <span className="service-price-label">Price:</span>
                <span className="service-price-value">{service.priceLabel}</span>
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => handleOpenModal(service)}
              >
                Request Service
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedService && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">
                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                  {selectedService.icon}
                </span>
              </div>
              <div>
                <div className="modal-title">Request {selectedService.name}</div>
                <div className="modal-sub">{selectedService.priceLabel}</div>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelectedServiceKey(null)}
              >
                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                  close
                </span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Service Type</label>
                <input
                  type="text"
                  value={selectedService.name}
                  disabled
                  style={{ background: 'var(--bg-main)' }}
                />
              </div>
              {byWeight && (
                <div className="form-group">
                  <label htmlFor="service-weight">Weight (kg)</label>
                  <input id="service-weight" type="number" min="0.01" max="1000" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label>Estimated Charge</label>
                <input
                  type="text"
                  value={estimate == null ? 'Enter a valid weight' : formatINR(estimate)}
                  disabled
                  style={{ background: 'var(--bg-main)' }}
                />
              </div>
              <div className="form-group">
                <label>Specific Instructions / Notes</label>
                <textarea
                  placeholder="e.g. Please pick up 2kg clothes from room 101"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedServiceKey(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateRequest}
                disabled={submitting || !validQuantity}
              >
                {submitting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
