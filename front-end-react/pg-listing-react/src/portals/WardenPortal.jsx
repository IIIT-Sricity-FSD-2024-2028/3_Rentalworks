import React from 'react';
import { WardenPortal as WardenPortalContent } from '@warden/App';
import '@warden/style_warden.css';

export default function WardenPortal() {
  return (
    <div className="portal-warden-scope">
      <WardenPortalContent />
    </div>
  );
}
