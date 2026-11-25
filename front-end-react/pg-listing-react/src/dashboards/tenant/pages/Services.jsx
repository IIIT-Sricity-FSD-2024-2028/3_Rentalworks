import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { tenantServiceRequests, tenantServicesCatalog } from '../../../features/tenant/tenantSlices';
import { toastError } from '../../../features/ui/uiSlice';
import { useTenant } from '../hooks/useTenant';

const defaultCatalog = [
  {
    name: 'Laundry',
    type: 'Laundry',
    price: 50,
    priceLabel: '₹50 per kg',
    icon: 'local_laundry_service',
    description: 'Washing, drying, and ironing clothes service',
  },
  {
    name: 'Parking',
    type: 'Parking',
    price: 500,
    priceLabel: '₹500/month',
    icon: 'directions_car',
    description: 'Reserved slot for two or four wheeler parking',
  },
  {
    name: 'Room Cleaning',
    type: 'Cleaning',
    price: 150,
    priceLabel: '₹150 per session',
    icon: 'cleaning_services',
    description: 'Thorough room deep cleaning and floor mop',
  },
  {
    name: 'Pantry & Appliances',
    type: 'Maintenance',
    price: 0,
    priceLabel: 'Included in rent',
    icon: 'coffee',
    description: 'Common microwave, toaster, and kettle maintenance',
  },
];

const PRICING = { per_kg: ' per kg', per_session: ' per session', per_month: '/month', monthly: '/month', per_use: ' per use' };
const ICONS = [
  [/laundry|wash/i, 'local_laundry_service', 'Laundry'],
  [/park/i, 'directions_car', 'Parking'],
  [/clean/i, 'cleaning_services', 'Cleaning'],
  [/pantry|kitchen|food|meal/i, 'coffee', 'Maintenance'],
];

/** Service row configured by the owner/admin → catalogue card. */
const mapService = (s) => {
  const price = Number(s.price) || 0;
  const [, icon, type] = ICONS.find(([re]) => re.test(s.name)) || [null, 'build', s.name];
  return {
    id: s.id,
    name: s.name,
    type,
    price,
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
  const services = useSelector(tenantServicesCatalog.selectors.selectItems);
  const loading = requestsLoading && requests.length === 0;

  // Services configured for this property, else the standard catalogue.
  const available = services.filter((s) => s.isAvailable !== false);
  const catalog = available.length ? available.map(mapService) : defaultCatalog;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(defaultCatalog[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dispatch(tenantServiceRequests.thunks.fetchAll());
  }, [dispatch]);

  useEffect(() => {
    if (propertyId) dispatch(tenantServicesCatalog.thunks.fetchAll(propertyId));
  }, [dispatch, propertyId]);

  const handleOpenModal = (service) => {
    if (!propertyId) {
      dispatch(toastError('You need an active stay to request services.'));
      return;
    }
    setSelectedService(service);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    if (e) e.preventDefault();
    const { ok } = await runThunk(
      dispatch,
      tenantServiceRequests.thunks.createItem({
        serviceType: selectedService.type,
        serviceName: selectedService.name,
        serviceId: selectedService.id,
        amount: selectedService.price,
        description: notes.trim() || undefined,
        notes: notes.trim() || undefined,
        propertyId: Number(propertyId),
        roomId: activeBooking?.roomId ? Number(activeBooking.roomId) : undefined,
      }),
      { success: `${selectedService.name} requested` },
    );
    if (ok) setIsModalOpen(false);
  };

  const handleCancelRequest = (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this service request?')) return;
    runThunk(dispatch, tenantServiceRequests.thunks.removeItem(requestId), { success: 'Service request cancelled' });
  };

  const activeCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress' || r.status === 'scheduled',
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <h1>Services</h1>
        <p>Available amenities and on-demand services</p>
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
                      <td>₹{Number(req.amount || 0).toLocaleString()}</td>
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
                        {req.status !== 'completed' && (
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

      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
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
              <div className="form-group">
                <label>Estimated Charge</label>
                <input
                  type="text"
                  value={selectedService.priceLabel}
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
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateRequest}
                disabled={submitting}
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
