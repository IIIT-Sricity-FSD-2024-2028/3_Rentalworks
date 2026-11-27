import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../features/auth/authSlice';
import { toastSuccess, toastError } from '../features/ui/uiSlice';

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

export function useSignOut(destination = '/login') {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return async () => {
    const result = await dispatch(logout());
    if (logout.fulfilled.match(result)) {
      if (destination) navigate(destination, { replace: true });
      else dispatch(toastSuccess('You have been signed out'));
    } else if (!result.meta.condition) {
      dispatch(toastError('Could not sign out. Please try again.'));
    }
  };
}

/**
 * Dispatch a fetch thunk on mount (and whenever `deps` change).
 * Usage: useFetchOnMount(fetchMyIssues)
 */
export function useFetchOnMount(thunk, arg, deps = []) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (thunk) dispatch(thunk(arg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, thunk, ...deps]);
}

/**
 * Wraps a dispatched thunk: unwraps it, shows a toast on success/failure and
 * returns { ok, data, error } so components don't need try/catch everywhere.
 */
export async function runThunk(dispatch, thunkAction, { success, error: errorPrefix } = {}) {
  try {
    const data = await dispatch(thunkAction).unwrap();
    if (success) dispatch(toastSuccess(typeof success === 'function' ? success(data) : success));
    return { ok: true, data };
  } catch (err) {
    const message = typeof err === 'string' ? err : err?.message || 'Something went wrong';
    dispatch(toastError(errorPrefix ? `${errorPrefix}: ${message}` : message));
    return { ok: false, error: message };
  }
}
