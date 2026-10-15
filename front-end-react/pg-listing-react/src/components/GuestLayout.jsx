import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AuthModal from './AuthModal';

export default function GuestLayout() {
  return (
    <div className="app-root">
      <Navbar />
      <AuthModal />
      <main className="app-main-view">
        <Outlet />
      </main>
    </div>
  );
}
