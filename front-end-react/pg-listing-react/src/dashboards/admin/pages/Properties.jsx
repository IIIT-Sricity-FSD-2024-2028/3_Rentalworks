import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminProperties, adminUsers } from '../../../features/admin/adminSlices';
import { useToast } from '../components/useToast';
import Modal from '../components/Modal';
import { mapRoom } from '../../../features/listings/listingMappers';
import { propertyDocumentsRepo } from '../../../features/repositories';
import DocumentReview from '../components/DocumentReview';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');

export default function Properties() {
  const dispatch = useDispatch();
  const properties = useSelector(adminProperties.selectors.selectItems);
  const loading = useSelector(adminProperties.selectors.selectIsLoading) && properties.length === 0;
  const saving = useSelector(adminProperties.selectors.selectMutating);
  const owners = useSelector(adminUsers.selectors.selectItems).filter(u => u.role === 'owner');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const toast = useToast();

  useEffect(() => {
    dispatch(adminProperties.thunks.fetchAll());
    dispatch(adminUsers.thunks.fetchAll());
    dispatch(propertyDocumentsRepo.thunks.fetchAll());
  }, [dispatch]);
  const documents = useSelector(propertyDocumentsRepo.selectors.selectItems);
  const waitingDocs = (id) => documents.filter((d) => String(d.propertyId) === String(id) && d.status === 'pending').length;

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const ownerName = getName(p.owner).toLowerCase();
    return !search ||
      p.name?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      ownerName.includes(q);
  });

  const counts = {
    total: properties.length,
    approved: properties.filter(p => p.status === 'approved').length,
    pending: properties.filter(p => p.status === 'pending').length,
    rejected: properties.filter(p => p.status === 'rejected').length
  };

  const updatePropState = async (id, data, successTitle, successMsg) => {
    const { ok } = await runThunk(dispatch, adminProperties.thunks.updateItem({ id, changes: data }), {
      success: successTitle ? `${successTitle}: ${successMsg}` : undefined,
    });
    return ok;
  };

  // --- ACTIONS ---

  const handleApprove = async (id) => {
    const p = properties.find(x => String(x.id) === String(id));
    await updatePropState(id, { status: 'approved' }, 'Property Approved', `${p?.name || 'Property'} is now live on the platform`);
  };

  const handleReject = (p) => {
    setModal({
      type: 'confirm',
      title: 'Reject Property',
      message: `Are you sure you want to reject "${p.name}"? The owner will be notified.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Reject',
      action: async () => {
        if (await updatePropState(p.id, { status: 'rejected' }, 'Property Rejected', `${p.name} has been rejected`)) setModal(null);
      }
    });
  };

  const handleOffboard = (p) => {
    setModal({
      type: 'confirm',
      title: 'Initiate Notice Period',
      message: `This will begin the offboarding process for "${p.name}". The property will enter a notice period before removal. Tenants will be notified.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Initiate Notice Period',
      action: async () => {
        if (await updatePropState(p.id, { status: 'offboarding' }, 'Notice Period Initiated', `${p.name} has entered the offboarding notice period`)) setModal(null);
      }
    });
  };

  const handleFinalRemove = (p) => {
    setModal({
      type: 'confirm',
      title: 'Finalize Removal',
      message: `This will permanently remove "${p.name}" from the platform. This cannot be undone.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Remove Property',
      action: async () => {
        const { ok } = await runThunk(dispatch, adminProperties.thunks.removeItem(p.id), { success: `${p.name} has been removed` });
        if (ok) setModal(null);
      }
    });
  };

  const handleViewDocs = (p) => {
    setModal({
      type: 'verify-docs',
      prop: p,
      title: `Review documents: ${p.name}`,
      subtitle: 'Open each file, then approve it or reject it with a reason for the owner'
    });
  };

  const handleOpenInspection = (p) => {
    setModal({
      type: 'inspection',
      prop: p,
      title: `Live Inspection: ${p.name}`,
      subtitle: `Field audit verification for ${p.name}`
    });
  };

  const handleAdd = () => {
    setModal({
      type: 'add',
      title: 'Add New Property',
      subtitle: 'Register a new PG property',
      fields: {
        name: '',
        location: '',
        ownerId: '',
        rentMin: '',
        rentMax: '',
        rooms: '0/20'
      }
    });
  };

  const handleEdit = (p) => {
    setModal({
      type: 'edit',
      prop: p,
      title: 'Edit Property',
      subtitle: p.name,
      fields: {
        name: p.name || '',
        location: p.location || '',
        ownerId: String(p.ownerId ?? p.owner?.id ?? ''),
        rentMin: p.rentMin ?? '',
        rentMax: p.rentMax ?? ''
      }
    });
  };

  const validateFields = (f) => {
    const rentMin = Number(f.rentMin);
    const rentMax = Number(f.rentMax);
    if (!f.name.trim()) return 'Property name required';
    if (!f.location.trim()) return 'Location required';
    if (!f.ownerId) return 'Select an owner';
    if (!(rentMin > 0)) return 'Enter valid min rent';
    if (!(rentMax >= rentMin)) return 'Max rent cannot be below min rent';
    return '';
  };

  const handleSave = async () => {
    if (!modal || saving) return;
    const f = modal.fields;
    const problem = validateFields(f);
    if (problem) { toast('error', 'Validation', problem); return; }
    const data = { name: f.name.trim(), location: f.location.trim(), ownerId: Number(f.ownerId), rentMin: Number(f.rentMin), rentMax: Number(f.rentMax) };
    const { ok } = modal.type === 'add'
      ? await runThunk(dispatch, adminProperties.thunks.createItem({ ...data, rooms: f.rooms || '0/20', amenities: ['WiFi'] }), { success: `${data.name} added and pending review` })
      : await runThunk(dispatch, adminProperties.thunks.updateItem({ id: modal.prop.id, changes: data }), { success: 'Changes saved' });
    if (!ok) return;
    setModal(null);
    dispatch(adminProperties.thunks.fetchAll()); // reload the owner relation
  };

  return (
    <>
      <div className="sec-hdr">
        <h2>PG Property Management</h2>
        <p>Manage listings, onboarding pipeline and property approvals</p>
      </div>

      {/* Summary KPIs */}
      <div className="prop-summary">
        <div className="u-sum-card">
          <div className="u-sum-label">Total Properties</div>
          <div className="u-sum-val">{counts.total}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Approved</div>
          <div className="u-sum-val green">{counts.approved}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Pending Pipeline</div>
          <div className="u-sum-val" style={{ color: '#d97706' }}>{counts.pending}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Rejected</div>
          <div className="u-sum-val red">{counts.rejected}</div>
        </div>
      </div>

      {/* Search Header */}
      <div className="tbl-hdr" style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div className="search-wrap">
          <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
          <input
            type="text"
            placeholder="Search by property name, owner, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-add" onClick={handleAdd}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span> Add Property
        </button>
      </div>

      {/* Property Cards Grid */}
      <div className="prop-grid">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, gridColumn: '1/-1' }}>Loading properties...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, gridColumn: '1/-1' }}>No properties found</div>
        ) : (
          filtered.map(p => {
            const ownerName = getName(p.owner);
            const docsOk = p.docsVerified || false;
            const inspectionOk = p.inspectionPassed || false;
            const hasChangeReq = p.changeRequestPending || false;
            const commission = p.commissionRate || 10;
            const compliance = p.compliance || 'Verified';
            const fireSafety = p.fireSafety || 'Yes';

            return (
              <div key={p.id} className="prop-card">
                <div className="prop-card-hdr">
                  <h3>
                    {p.name}
                    {p.status === 'offboarding' && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: '#ffedd5', color: '#ea580c', marginLeft: 6 }}>
                        Offboarding
                      </span>
                    )}
                  </h3>
                  <span className={`badge badge-${p.status}`}>{cap(p.status)}</span>
                </div>

                <div className="prop-location">📍 {p.location}</div>
                <div className="prop-owner">Owner: <span>{ownerName}</span></div>

                {/* Pipeline badges for pending */}
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: docsOk ? '#dcfce7' : '#fef9c3', color: docsOk ? '#15803d' : '#b45309' }}>
                      {docsOk ? '✓' : '⏳'} Docs {docsOk ? 'Verified' : 'Pending'}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: inspectionOk ? '#dcfce7' : '#fef9c3', color: inspectionOk ? '#15803d' : '#b45309' }}>
                      {inspectionOk ? '✓' : '⏳'} Inspection {inspectionOk ? 'Passed' : 'Pending'}
                    </span>
                  </div>
                )}

                {/* Change Request Alert */}
                {hasChangeReq && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠️ <strong>Change Request Pending</strong> — Owner requested rent/location update
                  </div>
                )}

                {/* Approval needs at least one photo (enforced on the server too). */}
                {p.status === 'pending' && !(Array.isArray(p.images) && p.images.length) && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 11, color: '#991b1b' }}>
                    📷 <strong>No photo uploaded</strong> — the owner must add one before this property can be approved
                  </div>
                )}

                <div className="prop-details">
                  <div className="prop-detail">
                    <div className="pd-lbl">Rent per bed</div>
                    <div className="pd-val">
                      {[['single', 'Single'], ['double', 'Double'], ['triple', 'Triple']]
                        .filter(([k]) => p.sharingRents?.[k])
                        .map(([k, l]) => `${l} ₹${Number(p.sharingRents[k]).toLocaleString('en-IN')}`)
                        .join(' · ') || `₹${(p.rentMin || 0).toLocaleString()} – ₹${(p.rentMax || 0).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Verification</div>
                    <div className="pd-val">
                      {p.docsVerified && p.inspectionPassed
                        ? 'Docs + inspection done'
                        : p.docsVerified
                          ? 'Inspection pending'
                          : 'Docs not verified'}
                    </div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Beds taken</div>
                    <div className="pd-val">
                      {(() => {
                        const rooms = (p.roomEntities || []).map(mapRoom);
                        if (!rooms.length) return 'No rooms added';
                        const total = rooms.reduce((n, r) => n + r.capacity, 0);
                        const taken = rooms.reduce((n, r) => n + r.currentOccupancy, 0);
                        return `${taken} / ${total} in ${rooms.length} room${rooms.length === 1 ? '' : 's'}`;
                      })()}
                    </div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Occupancy</div>
                    <div className="pd-val">{p.occupancy || 0}%</div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Commission Rate</div>
                    <div className="pd-val" style={{ color: '#7c3aed' }}>{commission}%</div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Compliance</div>
                    <div className="pd-val" style={{ color: '#16a34a', fontSize: 12 }}>✓ {compliance}</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
                  🔥 Fire Safety: {fireSafety}
                </div>

                <div className="prop-amenities">
                  {(p.amenities || ['WiFi']).map((a, i) => (
                    <span key={i} className="amenity-tag">{a}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="prop-actions">
                  {p.status === 'pending' && (
                    docsOk && inspectionOk ? (
                      <>
                        <button className="btn-approve" onClick={() => handleApprove(p.id)}>✓ Approve Property</button>
                        <button className="btn-reject" onClick={() => handleReject(p)}>✗ Reject</button>
                      </>
                    ) : (
                      <>
                        {!docsOk && (
                          <button className="btn-verify-docs" onClick={() => handleViewDocs(p)}>
                            📂 Review Documents{waitingDocs(p.id) ? ` (${waitingDocs(p.id)} waiting)` : ''}
                          </button>
                        )}
                        {docsOk && !inspectionOk && (
                          <button className="btn-inspection" onClick={() => handleOpenInspection(p)}>
                            📝 Pass Live Inspection
                          </button>
                        )}
                      </>
                    )
                  )}

                  {p.status === 'approved' && (
                    <>
                      <button className="btn-edit-prop" onClick={() => handleEdit(p)}>✏️ Edit</button>
                      <button className="btn-offboard" onClick={() => handleOffboard(p)}>⚠️ Notice Period</button>
                    </>
                  )}

                  {p.status === 'offboarding' && (
                    <button className="btn-reject" onClick={() => handleFinalRemove(p)}>Finalize Removal</button>
                  )}

                  {p.status === 'rejected' && (
                    <button className="btn-approve" onClick={() => handleApprove(p.id)}>Reconsider</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Dialogs */}
      <Modal
        show={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title || ''}
        subtitle={modal?.subtitle || ''}
        footer={
          modal?.type === 'confirm' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className={modal.btnClass || 'btn-confirm-red'} onClick={modal.action}>
                {modal.btnText || 'Confirm'}
              </button>
            </>
          ) : modal?.type === 'verify-docs' ? (
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          ) : modal?.type === 'inspection' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm-blue"
                disabled={saving || ![0, 1, 2].every(i => modal.checks?.[i])}
                onClick={async () => {
                  if (await updatePropState(modal.prop.id, { inspectionPassed: true }, 'Inspection Passed', `${modal.prop.name} passed live inspection audit`)) setModal(null);
                }}
              >
                Submit Inspection Report
              </button>
            </>
          ) : modal?.type === 'add' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-blue" disabled={saving} onClick={handleSave}>Add Property</button>
            </>
          ) : modal?.type === 'edit' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-blue" disabled={saving} onClick={handleSave}>Save Changes</button>
            </>
          ) : (
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          )
        }
      >
        {/* Document Viewer Modal Content */}
        {modal?.type === 'verify-docs' && <DocumentReview property={modal.prop} />}

        {/* Live Inspection Audit Modal Content */}
        {modal?.type === 'inspection' && (
          <div style={{ marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
            <div style={{ background: '#fffbeb', padding: 10, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #f59e0b' }}>
              <small style={{ color: '#92400e', display: 'block' }}>Field Audit for:</small>
              <strong style={{ color: '#92400e' }}>{modal.prop.name}</strong>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={Boolean(modal.checks?.[0])} onChange={() => setModal({ ...modal, checks: { ...modal.checks, 0: !modal.checks?.[0] } })} /> Structural Integrity Check Passed
              </label>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={Boolean(modal.checks?.[1])} onChange={() => setModal({ ...modal, checks: { ...modal.checks, 1: !modal.checks?.[1] } })} /> CCTV & Security Operational
              </label>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={Boolean(modal.checks?.[2])} onChange={() => setModal({ ...modal, checks: { ...modal.checks, 2: !modal.checks?.[2] } })} /> Fire Safety & Emergency Exits
              </label>
            </div>
          </div>
        )}

        {/* Confirm Modal Content */}
        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{modal.message}</p>
        )}

        {/* Add Modal Content */}
        {modal?.type === 'add' && (
          <div className="form-row">
            <div className="f-field">
              <label>Property Name *</label>
              <input
                value={modal.fields.name}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, name: e.target.value } })}
                placeholder="PG Name"
              />
            </div>
            <div className="f-field">
              <label>Location *</label>
              <input
                value={modal.fields.location}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, location: e.target.value } })}
                placeholder="Area, City"
              />
            </div>
            <div className="f-field">
              <label>Owner *</label>
              <select
                value={modal.fields.ownerId}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, ownerId: e.target.value } })}
              >
                <option value="">Select owner…</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
            </div>
            <div className="f-field">
              <label>Total Rooms *</label>
              <input
                value={modal.fields.rooms}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, rooms: e.target.value } })}
                placeholder="e.g. 0/20"
              />
            </div>
            <div className="f-field">
              <label>Min Rent (₹) *</label>
              <input
                type="number"
                value={modal.fields.rentMin}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, rentMin: e.target.value } })}
                placeholder="5000"
              />
            </div>
            <div className="f-field">
              <label>Max Rent (₹) *</label>
              <input
                type="number"
                value={modal.fields.rentMax}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, rentMax: e.target.value } })}
                placeholder="8000"
              />
            </div>
          </div>
        )}

        {/* Edit Modal Content */}
        {modal?.type === 'edit' && (
          <div className="form-row">
            <div className="f-field">
              <label>Property Name *</label>
              <input
                value={modal.fields.name}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, name: e.target.value } })}
              />
            </div>
            <div className="f-field">
              <label>Owner *</label>
              <select
                value={modal.fields.ownerId}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, ownerId: e.target.value } })}
              >
                <option value="">Select owner…</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
            </div>
            <div className="f-field">
              <label>Location *</label>
              <input
                value={modal.fields.location}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, location: e.target.value } })}
              />
            </div>
            <div className="f-field">
              <label>Min Rent (₹) *</label>
              <input
                type="number"
                value={modal.fields.rentMin}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, rentMin: e.target.value } })}
              />
            </div>
            <div className="f-field">
              <label>Max Rent (₹) *</label>
              <input
                type="number"
                value={modal.fields.rentMax}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, rentMax: e.target.value } })}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
