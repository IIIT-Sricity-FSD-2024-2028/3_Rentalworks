import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Properties from './pages/Properties';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import Subscriptions from './pages/Subscriptions';
import Complaints from './pages/Complaints';
import Notifications from './pages/Notifications';
import { ToastProvider } from './components/Toast';

export function AdminPortal() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="properties" element={<Properties />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="payments" element={<Payments />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminPortal />
    </BrowserRouter>
  );
}

