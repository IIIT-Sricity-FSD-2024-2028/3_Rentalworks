import React, { useEffect, useMemo, useRef } from 'react';
import Icon from './Icon';
import useScreenState from '../../../app/useScreenState';

export const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp';
export const PHOTO_MAX_MB = 5;
export const PHOTO_MAX_COUNT = 5;

/** Same checks the server applies to property photos. */
export function photoFileError(file) {
  if (!/\.(jpe?g|png|webp)$/i.test(file.name) || !/^image\/(jpeg|png|webp)$/.test(file.type || 'image/jpeg')) return `${file.name}: use a JPG, PNG or WEBP photo`;
  if (file.size === 0) return `${file.name}: this file is empty`;
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) return `${file.name}: photo must be under ${PHOTO_MAX_MB} MB`;
  return '';
}

const sameFile = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Pick property photos from the laptop: drag them onto the box or click to
 * browse. Shows previews; the first photo is the cover on the listing.
 * `files` is an array of File objects (kept in the form until submit).
 */
export default function PhotoUploader({ id = 'propertyPhotos', files = [], onChange, error, maxCount = PHOTO_MAX_COUNT, existingCount = 0 }) {
  const inputRef = useRef(null);
  const [over, setOver] = useScreenState(false);
  const [note, setNote] = useScreenState('');
  const room = Math.max(0, maxCount - existingCount);

  // Object URLs for previews, released when files change or the form closes.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // A photo dropped next to the box must not open in the browser and lose the form.
  useEffect(() => {
    const block = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const add = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return; // picker cancelled
    const problems = [];
    const next = [...files];
    for (const f of incoming) {
      const err = photoFileError(f);
      if (err) problems.push(err);
      else if (next.some((x) => sameFile(x, f))) problems.push(`${f.name}: already added`);
      else if (next.length >= room) problems.push(`Only ${maxCount} photos per property; ${f.name} was not added`);
      else next.push(f);
    }
    setNote(problems.join(' · '));
    onChange(next);
  };

  const remove = (i) => {
    setNote('');
    onChange(files.filter((_, j) => j !== i));
  };

  const border = error ? 'var(--danger, #dc2626)' : over ? 'var(--primary, #4f46e5)' : 'var(--border, #cbd5e1)';

  return (
    <div>
      {room > 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add property photos: drag photos here or press Enter to browse"
          aria-describedby={`${id}-hint`}
          aria-invalid={Boolean(error) || undefined}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            add(e.dataTransfer.files);
          }}
          style={{
            border: `2px dashed ${border}`,
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: over ? 'var(--primary-light, #eef2ff)' : 'transparent',
          }}
        >
          <Icon className="material-icons icon-24">add_photo_alternate</Icon>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            <strong>Drag photos from your laptop here</strong> <span className="text-muted">or click to browse</span>
          </div>
          <div id={`${id}-hint`} className="prop-sub-row" style={{ marginTop: 4 }}>
            JPG, PNG or WEBP, up to {PHOTO_MAX_MB} MB each · {room - files.length > 0 ? `${room - files.length} more allowed` : 'limit reached'}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
          {files.map((f, i) => (
            <figure key={`${f.name}-${f.lastModified}`} style={{ margin: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border, #e5e7eb)' }}>
              <img src={previews[i]} alt={f.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
              {i === 0 && existingCount === 0 && (
                <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--primary, #4f46e5)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>Cover</span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${f.name}`}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,.75)', color: '#fff', border: 0, borderRadius: 999, width: 24, height: 24, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <Icon className="material-icons icon-14">close</Icon>
              </button>
              <figcaption className="prop-sub-row" style={{ padding: '4px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {note && (
        <div className="prop-sub-row" role="status" style={{ marginTop: 6, color: 'var(--warning, #b45309)' }}>
          {note}
        </div>
      )}
      {error && (
        <div className="form-error" role="alert" style={{ marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
