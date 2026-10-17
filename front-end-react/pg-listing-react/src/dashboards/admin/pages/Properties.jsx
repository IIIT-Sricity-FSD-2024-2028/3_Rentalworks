import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const pList = await api.getProperties();
      setProperties(Array.isArray(pList) ? pList : []);
    } catch {
      toast('error', 'Error', 'Failed to load properties');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    try {
      await api.updateProperty(id, data);
      setProperties(prev => prev.map(p => String(p.id) === String(id) ? { ...p, ...data } : p));
      if (successTitle) toast('success', successTitle, successMsg);
      return true;
    } catch {
      toast('error', 'Error', 'Failed to update property');
      return false;
    }
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
      message: `Are you sure you want to reject <strong>${p.name}</strong>? The owner will be notified.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Reject',
      action: async () => {
        await updatePropState(p.id, { status: 'rejected' });
        toast('error', 'Property Rejected', `${p.name} has been rejected`);
        setModal(null);
      }
    });
  };

  const handleOffboard = (p) => {
    setModal({
      type: 'confirm',
      title: 'Initiate Notice Period',
      message: `This will begin the offboarding process for <strong>${p.name}</strong>. The property will enter a notice period before removal. Tenants will be notified.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Initiate Notice Period',
      action: async () => {
        await updatePropState(p.id, { status: 'offboarding' });
        toast('warning', 'Notice Period Initiated', `${p.name} has entered the offboarding notice period`);
        setModal(null);
      }
    });
  };

  const handleFinalRemove = (p) => {
    setModal({
      type: 'confirm',
      title: 'Finalize Removal',
      message: `This will permanently remove <strong>${p.name}</strong> from the platform. This cannot be undone.`,
      btnClass: 'btn-confirm-red',
      btnText: 'Remove Property',
      action: async () => {
        await api.deleteProperty(p.id);
        setProperties(prev => prev.filter(x => String(x.id) !== String(p.id)));
        toast('success', 'Property Removed', `${p.name} has been removed from the platform`);
        setModal(null);
      }
    });
  };

  const handleViewDocs = (p) => {
    setModal({
      type: 'verify-docs',
      prop: p,
      title: `Verify Docs: ${p.name}`,
      subtitle: `Please verify the submitted legal & safety documentation for ${p.name}`
    });
  };

  const handleOpenInspection = (p) => {
    setModal({
      type: 'inspection',
      prop: p,
      title: `Live Inspection: ${p.name}`,
      subtitle: `Field audit verification for ${p.name}`,
      remarks: 'Site visit completed. All safety standards are met. Property is ready for live listing.'
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
        owner: '',
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
      subtitle: 'Note: Rent and Location changes require owner approval',
      fields: {
        name: p.name || '',
        owner: getName(p.owner) || '',
        safetyScore: p.safetyScore || 8.0,
        occupancy: p.occupancy || 0
      }
    });
  };

  const handleAddSave = async () => {
    if (!modal) return;
    const f = modal.fields;
    if (!f.name?.trim()) { toast('error', 'Validation', 'Property name required'); return; }
    if (!f.location?.trim()) { toast('error', 'Validation', 'Location required'); return; }
    if (!f.owner?.trim()) { toast('error', 'Validation', 'Owner name required'); return; }
    const rMin = parseInt(f.rentMin);
    const rMax = parseInt(f.rentMax);
    if (isNaN(rMin) || rMin <= 0) { toast('error', 'Validation', 'Enter valid min rent'); return; }
    if (isNaN(rMax) || rMax <= rMin) { toast('error', 'Validation', 'Max rent must be greater than min'); return; }

    try {
      const newProp = await api.createProperty({
        name: f.name.trim(),
        location: f.location.trim(),
        owner: f.owner.trim(),
        ownerId: 1,
        rentMin: rMin,
        rentMax: rMax,
        rooms: f.rooms || '0/20',
        amenities: ['WiFi']
      });
      setProperties(prev => [...prev, newProp]);
      toast('success', 'Property Added', `${f.name} added and pending review`);
    } catch {
      toast('error', 'Error', 'Failed to add property');
    }
    setModal(null);
  };

  const handleEditSave = async () => {
    if (!modal) return;
    const f = modal.fields;
    const p = modal.prop;
    const updated = {
      name: f.name.trim() || p.name,
      owner: f.owner.trim() || p.owner,
      safetyScore: parseFloat(f.safetyScore) || p.safetyScore,
      occupancy: parseInt(f.occupancy) || p.occupancy
    };

    await updatePropState(p.id, updated, 'Property Updated', 'Changes saved successfully');
    setModal(null);
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

                <div className="prop-details">
                  <div className="prop-detail">
                    <div className="pd-lbl">Rent Range</div>
                    <div className="pd-val">₹{(p.rentMin || 0).toLocaleString()} – ₹{(p.rentMax || 0).toLocaleString()}</div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Safety Score</div>
                    <div className="pd-val">{p.safetyScore || 8.0}/10</div>
                    <div className="safety-bar">
                      <div className="safety-fill" style={{ width: `${((p.safetyScore || 8.0) / 10) * 100}%` }} />
                    </div>
                  </div>
                  <div className="prop-detail">
                    <div className="pd-lbl">Rooms</div>
                    <div className="pd-val">{p.rooms || '1/10'} occupied</div>
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
                            📂 View & Verify Docs
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
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm-blue"
                onClick={async () => {
                  await updatePropState(modal.prop.id, { docsVerified: true }, 'Docs Verified', `Documentation for ${modal.prop.name} marked as verified`);
                  setModal(null);
                }}
              >
                Approve All Documents
              </button>
            </>
          ) : modal?.type === 'inspection' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm-blue"
                onClick={async () => {
                  await updatePropState(modal.prop.id, { inspectionPassed: true }, 'Inspection Passed', `${modal.prop.name} passed live inspection audit`);
                  setModal(null);
                }}
              >
                Submit Inspection Report
              </button>
            </>
          ) : modal?.type === 'add' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-blue" onClick={handleAddSave}>Add Property</button>
            </>
          ) : modal?.type === 'edit' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-blue" onClick={handleEditSave}>Save Changes</button>
            </>
          ) : (
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          )
        }
      >
        {/* Document Viewer Modal Content */}
        {modal?.type === 'verify-docs' && (
          <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
              Please review and verify the following submitted compliance files:
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 12, border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <span style={{ fontSize: 14 }}>📄 Ownership_Deed.pdf</span>
                <strong style={{ color: '#2563eb', cursor: 'pointer', fontSize: 12 }} onClick={() => toast('info', 'Document Viewer', 'Opening Ownership Deed preview...')}>VIEW</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 12, border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <span style={{ fontSize: 14 }}>📄 Fire_Safety_NOC.pdf</span>
                <strong style={{ color: '#2563eb', cursor: 'pointer', fontSize: 12 }} onClick={() => toast('info', 'Document Viewer', 'Opening Fire Safety NOC preview...')}>VIEW</strong>
              </div>
            </div>
          </div>
        )}

        {/* Live Inspection Audit Modal Content */}
        {modal?.type === 'inspection' && (
          <div style={{ marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
            <div style={{ background: '#fffbeb', padding: 10, borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #f59e0b' }}>
              <small style={{ color: '#92400e', display: 'block' }}>Field Audit for:</small>
              <strong style={{ color: '#92400e' }}>{modal.prop.name}</strong>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked /> Structural Integrity Check Passed
              </label>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked /> CCTV & Security Operational
              </label>
              <label style={{ display: 'flex', gap: 10, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked /> Fire Safety & Emergency Exits
              </label>
              <div style={{ marginTop: 5 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Inspector Remarks</label>
                <textarea
                  style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', height: 60, resize: 'none' }}
                  defaultValue={modal.remarks}
                />
              </div>
            </div>
          </div>
        )}

        {/* Confirm Modal Content */}
        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }} dangerouslySetInnerHTML={{ __html: modal.message }} />
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
              <label>Owner Name *</label>
              <input
                value={modal.fields.owner}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, owner: e.target.value } })}
                placeholder="Owner Full Name"
              />
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
              <label>Owner Name *</label>
              <input
                value={modal.fields.owner}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, owner: e.target.value } })}
              />
            </div>
            <div className="f-field">
              <label>Safety Score</label>
              <input
                type="number"
                step="0.1"
                value={modal.fields.safetyScore}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, safetyScore: e.target.value } })}
              />
            </div>
            <div className="f-field">
              <label>Occupancy %</label>
              <input
                type="number"
                value={modal.fields.occupancy}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, occupancy: e.target.value } })}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
