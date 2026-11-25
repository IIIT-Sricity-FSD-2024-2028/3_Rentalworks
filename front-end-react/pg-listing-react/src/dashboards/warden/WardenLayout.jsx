import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchWardenData } from '../../features/warden/wardenSlices';
import WardenLayoutComponent from './components/WardenLayout';
import ErrorBoundary from './components/ErrorBoundary';
import './style_warden.css';

export default function WardenLayout({ children }) {
  const dispatch = useDispatch();

  // Fresh data each time the portal opens; pages read it from the store.
  useEffect(() => {
    dispatch(fetchWardenData());
  }, [dispatch]);

  return (
    <div className="portal-warden-scope">
      <ErrorBoundary>
        <WardenLayoutComponent>
          {children}
        </WardenLayoutComponent>
      </ErrorBoundary>
    </div>
  );
}
