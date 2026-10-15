import React from 'react';
import { AdminPortal as AdminPortalContent } from '@admin/App';
import '@admin/App.css';

export default function AdminPortal() {
  return (
    <div className="portal-admin-scope">
      <AdminPortalContent />
    </div>
  );
}
