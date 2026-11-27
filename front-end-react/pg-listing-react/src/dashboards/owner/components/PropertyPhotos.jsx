import React from 'react';
import Icon from './Icon';
import PhotoUploader, { PHOTO_MAX_COUNT } from './PhotoUploader';
import useScreenState from '../../../app/useScreenState';
import useFileState from '../../../app/useFileState';

/**
 * Photos of an existing listing (Properties → View): see, add more, remove.
 * A listing must keep at least one photo; the first is the cover.
 */
export default function PropertyPhotos({ property, onAdd, onRemove }) {
  const [pending, setPending] = useFileState([]);
  const [busy, setBusy] = useScreenState(false);
  const stored = property.rawImages || [];
  const urls = property.photoUrls || [];

  const upload = async () => {
    setBusy(true);
    const ok = await onAdd({ propertyId: property.id, files: pending });
    setBusy(false);
    if (ok) setPending([]);
  };

  return (
    <div>
      <div className="flex-between mb-8">
        <div className="form-label" style={{ margin: 0 }}>
          Photos
        </div>
        {!stored.length && <span className="badge badge-open">No photo yet — required for approval</span>}
      </div>
      {stored.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
          {stored.map((path, i) => (
            <figure key={path} style={{ margin: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border, #e5e7eb)' }}>
              <img src={urls[i]} alt={`${property.name} photo ${i + 1}`} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
              {i === 0 && <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--primary, #4f46e5)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>Cover</span>}
              <button
                type="button"
                disabled={stored.length === 1 || busy}
                title={stored.length === 1 ? 'Add another photo before removing the last one' : 'Remove photo'}
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onRemove({ property, path })}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,.75)', color: '#fff', border: 0, borderRadius: 999, width: 24, height: 24, cursor: stored.length === 1 ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', opacity: stored.length === 1 ? 0.4 : 1 }}
              >
                <Icon className="material-icons icon-14">close</Icon>
              </button>
            </figure>
          ))}
        </div>
      )}
      {stored.length < PHOTO_MAX_COUNT && (
        <>
          <PhotoUploader id={`photos-${property.id}`} files={pending} onChange={setPending} existingCount={stored.length} />
          {pending.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={upload}>
              <Icon className="material-icons icon-16">upload_file</Icon> {busy ? 'Uploading…' : `Upload ${pending.length} photo${pending.length > 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
