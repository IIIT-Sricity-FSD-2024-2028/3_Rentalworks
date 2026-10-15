import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import Notifications from './pages/Notifications';
import Complaints from './pages/Complaints';
import Services from './pages/Services';
import Payments from './pages/Payments';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tenant" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="issues" element={<Issues />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/tenant/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="issues" element={<Issues />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/tenant/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
