import React from 'react';
import WardenLayoutComponent from './components/WardenLayout';
import ErrorBoundary from './components/ErrorBoundary';
import './style_warden.css';

export default function WardenLayout({ children }) {
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
