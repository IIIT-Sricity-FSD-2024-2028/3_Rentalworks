import { useEffect, useRef } from 'react';

/**
 * Re-runs `refresh` when the tab becomes visible again and on an interval
 * while it is visible, so bed availability stays current after someone
 * books in another tab or on another device.
 * The first load is left to the page's own effect.
 */
export default function useAutoRefresh(refresh, intervalMs = 60000) {
  const saved = useRef(refresh);
  useEffect(() => {
    saved.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let last = Date.now();
    const run = () => {
      // 'focus' and 'visibilitychange' usually fire together; run once.
      if (document.visibilityState !== 'visible' || Date.now() - last < 3000) return;
      last = Date.now();
      saved.current();
    };
    const timer = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [intervalMs]);
}
