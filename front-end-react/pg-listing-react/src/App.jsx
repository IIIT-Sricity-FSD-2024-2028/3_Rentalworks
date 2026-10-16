import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';

// Landing & PG Discovery Layout
import GuestLayout from './components/GuestLayout';
import LandingPage from './pages/LandingPage';
import ListingsPage from './pages/ListingsPage';
import PgDetailsLanding from './pages/PgDetailsLanding';
import BookingRoommate from './pages/BookingRoommate';
import BookingReview from './pages/BookingReview';
import PaymentGateway from './pages/PaymentGateway';
import BookingConfirmed from './pages/BookingConfirmed';
import MyBookings from './pages/MyBookings';
import Transactions from './pages/Transactions';

// Central Multi-Role Authentication
import Login from '@tenant/pages/Login';

// Connected Role-Based Portals
import TenantPortal from './portals/TenantPortal';
import OwnerPortal from './portals/OwnerPortal';
import AdminPortal from './portals/AdminPortal';
import WardenPortal from './portals/WardenPortal';
import SuperAdminPortal from './portals/SuperAdminPortal';
import ProtectedRoute from './components/ProtectedRoute';

import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <Routes>
            {/* 1. Standalone Original Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. Public PG Discovery & Booking Flow */}
            <Route element={<GuestLayout />}>
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/pgs" element={<ListingsPage />} />
              <Route path="/pg/:id" element={<PgDetailsLanding />} />
              <Route path="/pgs/:id" element={<PgDetailsLanding />} />
              <Route path="/booking/:id" element={<PgDetailsLanding />} />
              <Route path="/book/:id/roommate" element={<BookingRoommate />} />
              <Route path="/book/:id/review" element={<BookingReview />} />
              <Route path="/book/:id/payment" element={<PaymentGateway />} />
              <Route path="/payment/:bookingId" element={<PaymentGateway />} />
              <Route path="/book/:id/confirmed" element={<BookingConfirmed />} />
              <Route path="/booking-success/:bookingId" element={<BookingConfirmed />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/transactions" element={<Transactions />} />
            </Route>

            {/* 3. Central Multi-Role Login & Registration Portal */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />

            {/* 4. Role-Based Management Portals (Protected by Authenticated Session) */}
            <Route
              path="/tenant/*"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantPortal />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard/*" element={<Navigate to="/tenant/dashboard" replace />} />
            <Route
              path="/owner/*"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <OwnerPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AdminPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warden/*"
              element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/*"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminPortal />
                </ProtectedRoute>
              }
            />

            {/* 5. Global Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
