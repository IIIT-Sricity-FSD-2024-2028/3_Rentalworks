import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { clearScreenValue, setScreenValue } from '../features/ui/screenStateSlice';

export default function useScreenState(initialValue) {
  const id = useId();
  const dispatch = useDispatch();
  const store = useStore();
  const entry = useSelector((state) => state.screenState[id]);
  // Capture the mount default once, for when this field has no Redux entry.
  const [initial] = useState(() => ({ value: typeof initialValue === 'function' ? initialValue() : initialValue }));
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
    if (!Object.is(value, latest.value)) dispatch(setScreenValue({ id, value }));
  }, [dispatch, id, initial, store]);

  return [(entry ?? initial).value, setValue];
}
