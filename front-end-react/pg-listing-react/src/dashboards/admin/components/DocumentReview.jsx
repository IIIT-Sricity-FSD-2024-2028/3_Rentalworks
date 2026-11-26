import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { openProtectedFile } from '../../../services/apiClient';
import { showToast } from '../../../features/ui/uiSlice';
import { propertiesRepo, propertyDocumentsRepo } from '../../../features/repositories';
import { REQUIRED_DOCUMENTS, DOCUMENT_LABEL } from '../../../features/repositories/propertyDocumentsSlice';

const STATUS_STYLE = {
  approved: { background: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected: { background: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  pending: { background: '#fef3c7', color: '#92400e', label: 'Waiting for review' },
  missing: { background: '#f1f5f9', color: '#475569', label: 'Not uploaded yet' },
};

const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

/**
 * Admin review of one property's verification documents. Each file can be
 * opened, approved, or rejected with a reason the owner sees. When every
 * required document is approved the server marks the property's documents as
 * verified, which unlocks the inspection and approval steps.
 */
export default function DocumentReview({ property }) {
  const dispatch = useDispatch();
  const allDocs = useSelector(propertyDocumentsRepo.selectors.selectItems);
  const docs = allDocs.filter((d) => String(d.propertyId) === String(property.id));
  const live = useSelector((s) => propertiesRepo.selectors.selectById(s, property.id)) || property;
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState(null);

  const required = REQUIRED_DOCUMENTS.map((r) => ({ ...r, doc: docs.find((d) => d.docType === r.type) || null }));
  const extras = docs.filter((d) => !REQUIRED_DOCUMENTS.some((r) => r.type === d.docType));

  const review = async (doc, status, reviewNote = '') => {
    setBusyId(doc.id);
    const { ok } = await runThunk(dispatch, propertyDocumentsRepo.thunks.updateItem({ id: doc.id, changes: { status, reviewNote } }), {
      success: status === 'approved' ? `${DOCUMENT_LABEL[doc.docType] || 'Document'} approved` : `${DOCUMENT_LABEL[doc.docType] || 'Document'} rejected — owner notified`,
    });
    // docsVerified is recomputed on the server; reload both collections into the store.
    if (ok) await Promise.all([dispatch(propertyDocumentsRepo.thunks.fetchAll()), dispatch(propertiesRepo.thunks.fetchAll())]);
    setBusyId(null);
    if (ok) {
      setRejecting(null);
      setNote('');
    }
  };

  const open = (doc) => openProtectedFile(`/property-documents/${doc.id}/file`).catch((err) => dispatch(showToast({ message: err.message, type: 'error' })));

  const approvedCount = required.filter((r) => r.doc?.status === 'approved').length;

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
          background: live.docsVerified ? '#dcfce7' : '#eff6ff',
          color: live.docsVerified ? '#166534' : '#1e40af',
        }}
      >
        {live.docsVerified
          ? '✓ All required documents approved. Next: live inspection, then approve the property.'
          : `${approvedCount} of ${required.length} required documents approved. Open each file and check it matches the property and owner.`}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {[...required, ...extras.map((d) => ({ type: d.docType, label: DOCUMENT_LABEL[d.docType] || d.docType, doc: d }))].map(({ type, label, hint, doc }) => {
          const st = STATUS_STYLE[doc ? doc.status : 'missing'] || STATUS_STYLE.pending;
          return (
            <div key={`${type}-${doc?.id || 'missing'}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {doc ? `${doc.fileName} · ${kb(doc.size)} · uploaded ${new Date(doc.createdAt).toLocaleDateString('en-IN')}` : hint}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap', background: st.background, color: st.color }}>{st.label}</span>
              </div>

              {doc?.status === 'rejected' && doc.reviewNote && <div style={{ fontSize: 12, color: '#991b1b', marginTop: 6 }}>Reason given: {doc.reviewNote}</div>}

              {doc && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-cancel" onClick={() => open(doc)}>
                    📄 Open file
                  </button>
                  {doc.status !== 'approved' && (
                    <button type="button" className="btn-confirm-blue" disabled={busyId === doc.id} onClick={() => review(doc, 'approved')}>
                      ✓ Approve
                    </button>
                  )}
                  {doc.status !== 'rejected' && (
                    <button
                      type="button"
                      className="btn-confirm-red"
                      disabled={busyId === doc.id}
                      onClick={() => {
                        setRejecting(doc.id);
                        setNote('');
                      }}
                    >
                      ✗ Reject
                    </button>
                  )}
                </div>
              )}

              {rejecting === doc?.id && (
                <div style={{ marginTop: 10 }}>
                  <label htmlFor={`reject-${doc.id}`} style={{ fontSize: 12, fontWeight: 600 }}>
                    Reason (sent to the owner)
                  </label>
                  <textarea
                    id={`reject-${doc.id}`}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Name on the deed does not match the owner's ID"
                    style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="button" className="btn-cancel" onClick={() => setRejecting(null)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-confirm-red" disabled={!note.trim() || busyId === doc.id} onClick={() => review(doc, 'rejected', note.trim())}>
                      Send rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
        Owner: <strong>{live.owner?.name || 'Unknown'}</strong>
        {live.owner?.phone ? ` • ${live.owner.phone}` : ''}
        {live.owner?.email ? ` • ${live.owner.email}` : ''}
      </p>
    </div>
  );
}
