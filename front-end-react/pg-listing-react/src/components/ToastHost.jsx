import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast, selectToasts } from '../features/ui/uiSlice';

const COLORS = {
  success: { bg: '#ecfdf5', border: '#10b981', fg: '#065f46', icon: 'check_circle' },
  error: { bg: '#fef2f2', border: '#ef4444', fg: '#991b1b', icon: 'error' },
  warning: { bg: '#fffbeb', border: '#f59e0b', fg: '#92400e', icon: 'warning' },
  info: { bg: '#eff6ff', border: '#3b82f6', fg: '#1e3a8a', icon: 'info' },
};

function Toast({ toast }) {
  const dispatch = useDispatch();
  const c = COLORS[toast.type] || COLORS.info;

  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissToast(toast.id)), toast.duration || 3500);
    return () => clearTimeout(t);
  }, [dispatch, toast.id, toast.duration]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 280,
        maxWidth: 420,
        padding: '12px 14px',
        background: c.bg,
        color: c.fg,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 10,
        boxShadow: '0 10px 25px rgba(15,23,42,0.15)',
        fontSize: 14,
        lineHeight: 1.4,
      }}
    >
      <span className="material-icons-outlined" style={{ fontSize: 20, color: c.border }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dispatch(dismissToast(toast.id))}
        style={{ background: 'none', border: 0, color: c.fg, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

/** Renders the global toast queue held in the `ui` slice. */
export default function ToastHost() {
  const toasts = useSelector(selectToasts);
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100000, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
