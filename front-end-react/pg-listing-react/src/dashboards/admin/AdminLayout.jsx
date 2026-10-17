import React from 'react';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import './App.css';

export default function AdminLayout({ children }) {
  return (
    <div className="portal-admin-scope">
      <ToastProvider>
        {children || <Layout />}
      </ToastProvider>
    </div>
  );
}
