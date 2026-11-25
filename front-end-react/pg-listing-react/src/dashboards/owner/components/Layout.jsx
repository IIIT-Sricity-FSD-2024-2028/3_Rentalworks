import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Layout component: Master layout wrapper with Sidebar, Topbar Header, and main content area
// Uses Outlet from react-router-dom to render the current matching route component
export default function Layout({
  unreadNotifsCount = 0,
  openIssuesCount = 0,
  user,
  onLogout
}) {
  // Mobile drawer state: controls whether the sidebar is open on smaller screens
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadNotifsCount={unreadNotifsCount}
        openIssuesCount={openIssuesCount}
        user={user}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          unreadNotifsCount={unreadNotifsCount}
          onLogout={onLogout}
        />

        {/* Dynamic Page Content rendered by React Router */}
        <main className="page-content" id="pageContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
