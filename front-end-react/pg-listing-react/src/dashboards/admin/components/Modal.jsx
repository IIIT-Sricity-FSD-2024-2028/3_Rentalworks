import { useEffect } from 'react';

export default function Modal({ show, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show) return null;

  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-hdr">
          <h3>{title}</h3>
          <span className="modal-close" onClick={onClose}><span className="material-icons-outlined" style={{fontSize: 24}}>close</span></span>
        </div>
        {subtitle && <p style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>{subtitle}</p>}
        <div>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
