import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [timer, setTimer] = useState(null);

  const showToast = useCallback((type, title, msg) => {
    setToast({ type, title, msg, show: true });
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setToast(prev => prev ? {...prev, show: false} : null), 3500);
    setTimer(t);
  }, [timer]);

  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
          <span className="t-ico"><span className="material-icons-outlined" style={{fontSize: 24}}>{icons[toast.type] || 'info'}</span></span>
          <div className="t-text"><strong>{toast.title}</strong><span>{toast.msg}</span></div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
