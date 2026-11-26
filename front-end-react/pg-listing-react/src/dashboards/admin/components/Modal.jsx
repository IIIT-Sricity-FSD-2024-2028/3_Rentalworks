import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Rendered straight into <body>. The page content has entrance animations that
// leave a `transform` on it, and a transformed ancestor turns `position: fixed`
// into "fixed to that element": the overlay then covered the whole tall page
// and the dialog was centred far below the visible screen.
export default function Modal({ show, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!show) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-hdr">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <span className="material-icons-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>
        {subtitle && <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{subtitle}</p>}
        <div>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
