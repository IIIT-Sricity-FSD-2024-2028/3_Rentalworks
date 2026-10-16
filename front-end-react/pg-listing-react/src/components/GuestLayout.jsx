import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function GuestLayout() {
  return (
    <div className="app-root">
      <Navbar />
      <main className="app-main-view">
        <Outlet />
      </main>
    </div>
  );
}
