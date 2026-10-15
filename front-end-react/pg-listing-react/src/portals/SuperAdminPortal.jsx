import React from 'react';
import { SuperAdminPortal as SuperAdminContent } from '@super-admin/App';
import '@super-admin/styles_admin.css';
import '@super-admin/morphism-effects.css';

export default function SuperAdminPortal() {
  return (
    <div className="portal-super-admin-scope">
      <SuperAdminContent />
    </div>
  );
}
