import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Public Pages
import GuestLayout from '../components/GuestLayout';
import LandingPage from '../pages/LandingPage';
import ListingsPage from '../pages/ListingsPage';
import PgDetailsLanding from '../pages/PgDetailsLanding';
import BookingRoommate from '../pages/BookingRoommate';
import BookingReview from '../pages/BookingReview';
import PaymentGateway from '../pages/PaymentGateway';
import BookingConfirmed from '../pages/BookingConfirmed';
import MyBookings from '../pages/MyBookings';
import Transactions from '../pages/Transactions';
import Login from '../pages/Login';
import Register from '../pages/Register';

// Protected Route Guards
import RoleProtectedRoute from '../components/RoleProtectedRoute';

// ========================================================
// 1. ADMIN DASHBOARD MODULE
// ========================================================
import AdminLayout from '../dashboards/admin/AdminLayout';
import AdminDashboard from '../dashboards/admin/pages/Dashboard';
import AdminUsers from '../dashboards/admin/pages/Users';
import AdminProperties from '../dashboards/admin/pages/Properties';
import AdminBookings from '../dashboards/admin/pages/Bookings';
import AdminPayments from '../dashboards/admin/pages/Payments';
import AdminSubscriptions from '../dashboards/admin/pages/Subscriptions';
import AdminComplaints from '../dashboards/admin/pages/Complaints';
import AdminNotifications from '../dashboards/admin/pages/Notifications';

// ========================================================
// 2. TENANT DASHBOARD MODULE
// ========================================================
import TenantLayout from '../dashboards/tenant/TenantLayout';
import TenantDashboard from '../dashboards/tenant/pages/Dashboard';
import TenantIssues from '../dashboards/tenant/pages/Issues';
import TenantNotifications from '../dashboards/tenant/pages/Notifications';
import TenantComplaints from '../dashboards/tenant/pages/Complaints';
import TenantServices from '../dashboards/tenant/pages/Services';
import TenantPayments from '../dashboards/tenant/pages/Payments';
import TenantProfile from '../dashboards/tenant/pages/Profile';

// ========================================================
// 3. OWNER DASHBOARD MODULE
// ========================================================
import OwnerLayout, {
  OwnerDashboardRoute,
  OwnerPropertiesRoute,
  OwnerAddPropertyRoute,
  OwnerIssuesRoute,
  OwnerNotificationsRoute,
  OwnerPolicyRoute,
  OwnerProfileRoute,
  OwnerSubscriptionRoute,
} from '../dashboards/owner/OwnerLayout';

// ========================================================
// 4. WARDEN DASHBOARD MODULE
// ========================================================
import WardenLayout from '../dashboards/warden/WardenLayout';
import WardenDashboard from '../dashboards/warden/pages/Dashboard';
import WardenTenants from '../dashboards/warden/pages/TenantRecords';
import WardenRooms from '../dashboards/warden/pages/RoomServices';
import WardenViolations from '../dashboards/warden/pages/RuleViolations';
import WardenComplaints from '../dashboards/warden/pages/Complaints';
import WardenNotifications from '../dashboards/warden/pages/Notifications';
import WardenProfile from '../dashboards/warden/pages/Profile';

// ========================================================
// 5. SUPERADMIN DASHBOARD MODULE
// ========================================================
import SuperAdminLayout, {
  SuperAdminDashboardRoute,
  SuperAdminRegionalAdminsRoute,
  SuperAdminGlobalReportsRoute,
  SuperAdminNotificationsRoute,
  SuperAdminProfileRoute,
} from '../dashboards/superadmin/SuperAdminLayout';

export default function AppRoutes() {
  return (
    <Routes>
      {/* ========================================================
          PUBLIC DISCOVERY & BOOKING FLOW
          ======================================================== */}
      <Route path="/" element={<LandingPage />} />

      <Route element={<GuestLayout />}>
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/pgs" element={<ListingsPage />} />
        <Route path="/pg/:id" element={<PgDetailsLanding />} />
        <Route path="/pgs/:id" element={<PgDetailsLanding />} />
        <Route path="/booking/:id" element={<PgDetailsLanding />} />
        <Route path="/book/:id/roommate" element={<BookingRoommate />} />
        <Route path="/book/:id/review" element={<BookingReview />} />
        <Route path="/book/:id/payment" element={<PaymentGateway />} />
        <Route path="/payment" element={<PaymentGateway />} />
        <Route path="/payment/:bookingId" element={<PaymentGateway />} />
        <Route path="/book/:id/confirmed" element={<BookingConfirmed />} />
        <Route path="/booking-success/:bookingId" element={<BookingConfirmed />} />
        <Route path="/confirmation" element={<BookingConfirmed />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/transactions" element={<Transactions />} />
      </Route>

      {/* Central Multi-Role Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ========================================================
          ADMIN DASHBOARD MODULE ROUTES
          ======================================================== */}
      <Route
        path="/dashboard/admin"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="properties" element={<AdminProperties />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>

      {/* ========================================================
          TENANT DASHBOARD MODULE ROUTES
          ======================================================== */}
      <Route
        path="/dashboard/tenant"
        element={
          <RoleProtectedRoute role="tenant">
            <TenantLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TenantDashboard />} />
        <Route path="issues" element={<TenantIssues />} />
        <Route path="notifications" element={<TenantNotifications />} />
        <Route path="complaints" element={<TenantComplaints />} />
        <Route path="services" element={<TenantServices />} />
        <Route path="payments" element={<TenantPayments />} />
        <Route path="profile" element={<TenantProfile />} />
      </Route>

      {/* ========================================================
          OWNER DASHBOARD MODULE ROUTES
          ======================================================== */}
      <Route
        path="/dashboard/owner"
        element={
          <RoleProtectedRoute role="owner">
            <OwnerLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboardRoute />} />
        <Route path="properties" element={<OwnerPropertiesRoute />} />
        <Route path="add-property" element={<OwnerAddPropertyRoute />} />
        <Route path="issues" element={<OwnerIssuesRoute />} />
        <Route path="notifications" element={<OwnerNotificationsRoute />} />
        <Route path="policy" element={<OwnerPolicyRoute />} />
        <Route path="profile" element={<OwnerProfileRoute />} />
        <Route path="subscription" element={<OwnerSubscriptionRoute />} />
      </Route>

      {/* ========================================================
          WARDEN DASHBOARD MODULE ROUTES
          ======================================================== */}
      <Route
        path="/dashboard/warden"
        element={
          <RoleProtectedRoute role="warden">
            <WardenLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<WardenDashboard />} />
        <Route path="tenants" element={<WardenTenants />} />
        <Route path="rooms" element={<WardenRooms />} />
        <Route path="violations" element={<WardenViolations />} />
        <Route path="complaints" element={<WardenComplaints />} />
        <Route path="notifications" element={<WardenNotifications />} />
        <Route path="profile" element={<WardenProfile />} />
      </Route>

      {/* ========================================================
          SUPERADMIN DASHBOARD MODULE ROUTES
          ======================================================== */}
      <Route
        path="/dashboard/superadmin"
        element={
          <RoleProtectedRoute role="super_admin">
            <SuperAdminLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboardRoute />} />
        <Route path="regional-admins" element={<SuperAdminRegionalAdminsRoute />} />
        <Route path="global-reports" element={<SuperAdminGlobalReportsRoute />} />
        <Route path="notifications" element={<SuperAdminNotificationsRoute />} />
        <Route path="profile" element={<SuperAdminProfileRoute />} />
      </Route>

      {/* ========================================================
          BACKWARDS-COMPATIBLE ROUTE ALIASES & REDIRECTS
          ======================================================== */}
      <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
      <Route path="/admin" element={<Navigate to="/dashboard/admin" replace />} />
      <Route path="/tenant/*" element={<Navigate to="/dashboard/tenant" replace />} />
      <Route path="/tenant" element={<Navigate to="/dashboard/tenant" replace />} />
      <Route path="/owner/*" element={<Navigate to="/dashboard/owner" replace />} />
      <Route path="/owner" element={<Navigate to="/dashboard/owner" replace />} />
      <Route path="/warden/*" element={<Navigate to="/dashboard/warden" replace />} />
      <Route path="/warden" element={<Navigate to="/dashboard/warden" replace />} />
      <Route path="/super-admin/*" element={<Navigate to="/dashboard/superadmin" replace />} />
      <Route path="/super-admin" element={<Navigate to="/dashboard/superadmin" replace />} />
      <Route path="/superadmin/*" element={<Navigate to="/dashboard/superadmin" replace />} />
      <Route path="/superadmin" element={<Navigate to="/dashboard/superadmin" replace />} />
      <Route path="/dashboard/super-admin/*" element={<Navigate to="/dashboard/superadmin" replace />} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/tenant" replace />} />

      {/* ========================================================
          GLOBAL 404 FALLBACK
          ======================================================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
