// Warden data now lives in the Redux store (features/warden/wardenSlices.js).
// WardenLayout loads it; pages read it here and call refreshData() after changes
// that affect several collections.
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWardenData, selectWarden } from '../../../features/warden/wardenSlices';
import { showToast } from '../../../features/ui/uiSlice';

export * from '../../../features/warden/wardenMappers';

export function useWardenData() {
  const dispatch = useDispatch();
  const warden = useSelector(selectWarden);

  const data = useMemo(
    () => ({
      rooms: warden.rooms,
      tenants: warden.tenants,
      complaints: warden.complaints,
      notifications: warden.notifications,
      violations: warden.violations,
      loaded: warden.loaded,
    }),
    [warden.rooms, warden.tenants, warden.complaints, warden.notifications, warden.violations, warden.loaded],
  );

  const refreshData = useCallback(() => dispatch(fetchWardenData()).unwrap(), [dispatch]);

  return { data, loading: !warden.loaded && warden.status !== 'failed', error: warden.error, refreshData };
}

/** Dispatch a warden thunk; resolves with its payload or throws an Error. */
export function useWardenRun() {
  const dispatch = useDispatch();
  return useCallback(
    async (action) => {
      try {
        return await dispatch(action).unwrap();
      } catch (err) {
        throw err instanceof Error ? err : new Error(typeof err === 'string' ? err : err?.message || 'Request failed');
      }
    },
    [dispatch],
  );
}

/** showToast(type, title, message) backed by the global toast queue. */
export function useWardenToast() {
  const dispatch = useDispatch();
  return useCallback(
    (type, title, message) => dispatch(showToast({ type, message: message && message !== title ? `${title}: ${message}` : title })),
    [dispatch],
  );
}
