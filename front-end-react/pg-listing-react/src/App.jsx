import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import AppRoutes from './routes/AppRoutes';
import './index.css';

/**
 * Root Application Component
 * 
 * Hierarchy:
 * main.jsx
 *    ↓
 * <App />
 *    ↓
 * <BrowserRouter>
 *    ↓
 * <AuthProvider>
 *    ↓
 * <BookingProvider>
 *    ↓
 * <AppRoutes />
 *    ↓
 * Public Discovery / Authenticated Dashboards
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <AppRoutes />
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
