import React from 'react';

export default function Modal({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay show" style={{ zIndex: 9999 }}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <span className="modal-close" onClick={onCancel}>
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>close</span>
          </span>
        </div>
        <div id="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          {onConfirm && (
            <button className="btn-confirm" onClick={onConfirm}>{confirmText}</button>
          )}
        </div>
      </div>
    </div>
  );
}
