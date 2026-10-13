import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function WardenLayout({ children }) {
  return (
    <div id="dashboard-page" className="active">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="content-area">
          <div id="main-content-target">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
