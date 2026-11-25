import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Layout from './components/Layout';
import { refreshProfile } from '../../features/auth/authSlice';
import { fetchMyStay, tenantNotifications } from '../../features/tenant/tenantSlices';
import './index.css';

export default function TenantLayout({ children }) {
  const dispatch = useDispatch();

  // Data every tenant page needs: profile, active stay and the unread badge.
  useEffect(() => {
    dispatch(refreshProfile());
    dispatch(fetchMyStay());
    dispatch(tenantNotifications.thunks.fetchAll());
  }, [dispatch]);

  return <div className="portal-tenant-scope">{children || <Layout />}</div>;
}
