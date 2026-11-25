import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../features/ui/uiSlice';

/** toast(type, title, message) backed by the global toast queue. */
export function useToast() {
  const dispatch = useDispatch();
  return useCallback((type, title, message) => dispatch(showToast({ type, message: message ? `${title}: ${message}` : title })), [dispatch]);
}
