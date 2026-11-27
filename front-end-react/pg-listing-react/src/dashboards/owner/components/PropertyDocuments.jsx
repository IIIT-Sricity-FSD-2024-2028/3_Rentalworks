import React from 'react';
import { useDispatch } from 'react-redux';
import Icon from './Icon';
import FileDropZone from './FileDropZone';
import { openProtectedFile } from '../../../services/apiClient';
import { showToast } from '../../../features/ui/uiSlice';
import { DOCUMENT_ACCEPT, DOCUMENT_LABEL, DOCUMENT_MAX_MB, documentFileError } from '../../../features/repositories/propertyDocumentsSlice';
import useScreenState from '../../../app/useScreenState';

const STATUS = {
  approved: ['badge-active', 'Approved'],
  rejected: ['badge-open', 'Rejected'],
  pending: ['badge-pending', 'Waiting for review'],
};

/** One-line summary for a property card. */
export function DocumentStatusLine({ property }) {
  const { docs, docsVerified } = property;
  if (docsVerified) return <span className="badge badge-active">Documents verified</span>;
  if (docs.rejected) return <span className="badge badge-open">{docs.rejected} document{docs.rejected > 1 ? 's' : ''} rejected — re-upload</span>;
  if (docs.missing) return <span className="badge badge-open">{docs.missing} document{docs.missing > 1 ? 's' : ''} missing</span>;
  return <span className="badge badge-pending">Documents under review</span>;
}

/**
 * Required documents for one property: status, the admin's reason when
 * rejected, and upload / replace / view / remove actions.
 */
export default function PropertyDocuments({ property, onUpload, onDelete }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useScreenState('');

  const open = (doc) =>
    openProtectedFile(`/property-documents/${doc.id}/file`).catch((err) => dispatch(showToast({ message: err.message, type: 'error' })));

  const upload = async (type, file) => {
    const err = documentFileError(file);
    if (err) return dispatch(showToast({ message: err, type: 'error' }));
    setBusy(type);
    await onUpload({ propertyId: property.id, docType: type, file });
    setBusy('');
  };

  const extras = property.documents.filter((d) => !property.docs.required.some((r) => r.type === d.docType));

  return (
    <div>
      <div className="flex-between mb-8">
        <div className="form-label" style={{ margin: 0 }}>
          Verification documents
        </div>
        <DocumentStatusLine property={property} />
      </div>
      <p className="text-muted" style={{ fontSize: 12, marginTop: 0 }}>
        An admin checks these before the property goes live. PDF / JPG / PNG / WEBP, up to {DOCUMENT_MAX_MB} MB.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {[...property.docs.required, ...extras.map((d) => ({ type: d.docType, label: DOCUMENT_LABEL[d.docType] || d.docType, doc: d }))].map(({ type, label, hint, doc }) => {
          const [cls, text] = doc ? STATUS[doc.status] || STATUS.pending : ['badge-open', 'Not uploaded'];
          const canReplace = !doc || doc.status !== 'approved';
          return (
            <div key={`${type}-${doc?.id || 'new'}`} style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, padding: 12 }}>
              <div className="flex-between" style={{ gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{label}</strong>
                  <div className="text-muted" style={{ fontSize: 12 }}>{doc ? doc.fileName : hint}</div>
                </div>
                <span className={`badge ${cls}`}>{text}</span>
              </div>
              {doc?.status === 'rejected' && doc.reviewNote && (
                <div className="alert-danger-sm" style={{ marginTop: 8 }} role="note">
                  Admin: {doc.reviewNote}
                </div>
              )}
              {canReplace && (
                <div style={{ marginTop: 10 }}>
                  <FileDropZone
                    compact
                    accept={DOCUMENT_ACCEPT}
                    disabled={Boolean(busy)}
                    label={busy === type ? 'Uploading…' : doc ? 'Drag a new file from your laptop to replace' : 'Drag a file from your laptop to upload'}
                    onFile={(file) => upload(type, file)}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {doc && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => open(doc)}>
                    <Icon className="material-icons icon-16">visibility</Icon> View
                  </button>
                )}
                {doc && doc.status !== 'approved' && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(doc.id)}>
                    <Icon className="material-icons icon-16">delete</Icon> Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
