import React from 'react';
import { OwnerPortal as OwnerPortalContent } from '@owner/App';
import '@owner/style.css';

export default function OwnerPortal() {
  return (
    <div className="portal-owner-scope">
      <OwnerPortalContent />
    </div>
  );
}
