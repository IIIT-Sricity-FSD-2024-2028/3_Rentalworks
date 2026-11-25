import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { selectTenantStay } from '../../../features/tenant/tenantSlices';

/** The signed-in tenant and their active stay, read from the Redux store. */
export function useTenant() {
  const tenant = useSelector(selectCurrentUser);
  const { activeBooking, status } = useSelector(selectTenantStay);
  const loading = status === 'idle' || (status === 'loading' && !activeBooking);
  return { tenant, activeBooking, loading };
}
