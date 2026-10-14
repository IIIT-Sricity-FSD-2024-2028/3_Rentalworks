import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';

import ListingsPage from './pages/ListingsPage';
import PgDetailsLanding from './pages/PgDetailsLanding';
import BookingRoommate from './pages/BookingRoommate';
import BookingReview from './pages/BookingReview';
import PaymentGateway from './pages/PaymentGateway';
import BookingConfirmed from './pages/BookingConfirmed';
import MyBookings from './pages/MyBookings';
import Transactions from './pages/Transactions';

import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <div className="app-root">
            <Navbar />
            <AuthModal />
            <main className="app-main-view">
              <Routes>
                <Route path="/" element={<ListingsPage />} />
                <Route path="/listings" element={<ListingsPage />} />
                <Route path="/pg/:id" element={<PgDetailsLanding />} />
                <Route path="/book/:id/roommate" element={<BookingRoommate />} />
                <Route path="/book/:id/review" element={<BookingReview />} />
                <Route path="/book/:id/payment" element={<PaymentGateway />} />
                <Route path="/book/:id/confirmed" element={<BookingConfirmed />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
