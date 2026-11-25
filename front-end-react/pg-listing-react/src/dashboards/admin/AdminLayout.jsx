import React from 'react';
import Layout from './components/Layout';
import './App.css';

export default function AdminLayout({ children }) {
  return <div className="portal-admin-scope">{children || <Layout />}</div>;
}
