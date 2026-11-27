import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * Upload box for laptop files: drag a file from File Explorer onto it, or
 * click to browse. Browsers decide which folder the picker opens in, so
 * dragging is the dependable way to use a file from a specific laptop folder.
 *
 * Edge cases handled here:
 *  - cancelling the picker keeps the file already chosen;
 *  - a file dropped next to the box is ignored instead of the browser
 *    opening it and leaving the page (which would lose the whole form);
 *  - several files dropped at once: the first is used and the user is told;
 *  - the chosen file can be removed again (onClear) before submitting.
 */
export default function FileDropZone({ id, accept, file, hint, error, disabled, compact, label = 'Drag a file from your laptop here', onFile, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState('');

  // While an upload box is on screen, a drop anywhere else on the page does nothing.
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

  const take = (files) => {
    if (!files || !files.length || disabled) return; // picker cancelled: keep the current file
    setNote(files.length > 1 ? `${files.length} files were dropped; only "${files[0].name}" was used. Each document needs its own box.` : '');
    onFile(files[0]);
  };

  const browse = () => !disabled && inputRef.current?.click();
  const border = error ? 'var(--danger, #dc2626)' : over ? 'var(--primary, #4f46e5)' : 'var(--border, #cbd5e1)';

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={file ? `${file.name} selected. Press Enter to choose a different file` : `${label}, or press Enter to browse`}
        aria-describedby={id ? `${id}-hint` : undefined}
        aria-invalid={Boolean(error) || undefined}
        onClick={browse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            browse();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${border}`,
          borderRadius: 10,
          padding: compact ? '10px 12px' : '16px 14px',
          background: over ? 'var(--primary-light, #eef2ff)' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: disabled ? 0.6 : 1,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <Icon className="material-icons icon-22">{file ? 'description' : 'upload_file'}</Icon>
        <div style={{ fontSize: 13, lineHeight: 1.4, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          {file ? (
            <>
              <strong>{file.name}</strong> <span className="text-muted">({Math.max(1, Math.ceil(file.size / 1024))} KB) · drop or click to change</span>
            </>
          ) : (
            <>
              <strong>{label}</strong> <span className="text-muted">or click to browse</span>
            </>
          )}
        </div>
        {file && onClear && !disabled && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`Remove ${file.name}`}
            onClick={(e) => {
              e.stopPropagation();
              setNote('');
              onClear();
            }}
          >
            <Icon className="material-icons icon-16">close</Icon> Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = ''; // lets the same file be chosen again after Remove
        }}
      />
      {note && (
        <div className="prop-sub-row" role="status" style={{ marginTop: 4, color: 'var(--warning, #b45309)' }}>
          {note}
        </div>
      )}
      {hint && (
        <div id={id ? `${id}-hint` : undefined} className="prop-sub-row" style={{ marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
