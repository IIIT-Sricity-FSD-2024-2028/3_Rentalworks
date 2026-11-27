import { useCallback, useId, useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { clearScreenValue, setScreenValue } from '../features/ui/screenStateSlice';

/**
 * Redux-backed replacement for React's useState, scoped to the mounted component.
 * Pass `{ secret: true }` for passwords: the value is masked in Redux DevTools
 * and removed from the store when the component unmounts (and on sign-out).
 */
export default function useScreenState(initialValue, { secret = false } = {}) {
  const id = useId();
  const dispatch = useDispatch();
  const store = useStore();
  const entry = useSelector((state) => state.screenState[id]);
  // Capture the mount default once, for when this field has no Redux entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => ({ value: typeof initialValue === 'function' ? initialValue() : initialValue }), []);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (store.getState().screenState[id]) dispatch(clearScreenValue(id));
    };
  }, [dispatch, id, store]);

  const setValue = useCallback((update) => {
    if (!mounted.current) return;
    const latest = store.getState().screenState[id] ?? initial;
    // Resolve functional updates against the store so fast successive changes compose.
    const value = typeof update === 'function' ? update(latest.value) : update;
    if (!Object.is(value, latest.value)) dispatch(setScreenValue({ id, value, secret }));
  }, [dispatch, id, initial, store, secret]);

  return [(entry ?? initial).value, setValue];
}
