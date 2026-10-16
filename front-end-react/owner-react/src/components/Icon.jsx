import React from "react";

// Local SVGs work without downloading an icon font. Names describe their purpose.
const paths = {
  apartment:
    "M4 22V3h12v19M16 9h4v13M8 7h1m3 0h1M8 11h1m3 0h1M8 15h1m3 0h1M9 22v-3h3v3",
  home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  bed: "M3 18V7m18 11V9M3 13h18M7 13V9h5v4m0-4h5v4M3 18h18M3 18v3m18-3v3",
  payments: "M2 5h20v14H2zM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M5 12h.01M19 12h.01",
  warning: "M12 3 2 21h20L12 3ZM12 9v5m0 3h.01",
  error: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20M12 7v6m0 4h.01",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20M12 11v6m0-10h.01",
  check_circle: "M22 11v1a10 10 0 1 1-6-9M9 11l3 3L22 4",
  check: "M4 12l5 5L20 6",
  close: "M6 6l12 12M6 18 18 6",
  add: "M12 5v14M5 12h14",
  search: "M21 21l-6-6M3 9a6 6 0 1 0 12 0A6 6 0 1 0 3 9",
  location_on:
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  visibility:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  edit: "m16 3 5 5M3 21l5-1L21 7l-5-5L3 15v6Z",
  delete: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  save: "M3 3h15l3 3v15H3V3ZM7 3v6h10V3M7 21v-8h10v8",
  person: "M8 6a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3",
  calendar_today: "M3 5h18v16H3zM7 2v6m10-6v6M3 11h18",
  schedule: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20M12 6v6l4 2",
  notifications: "M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4",
  mail: "M3 5h18v14H3zM3 5l9 8 9-8",
  send: "m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2",
  menu: "M3 6h18M3 12h18M3 18h18",
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  description: "M4 2h11l5 5v15H4zM14 2v6h6M8 12h8M8 16h8",
  workspace_premium: "M7 3h10v9l-5 3-5-3V3ZM8 14l-2 8 6-3 6 3-2-8",
  storefront: "M3 10v11h18V10M2 10l2-7h16l2 7H2ZM8 21v-7h8v7",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-6 2-3-3H5l-3-6 3-3V5l4-3Z",
  logout: "M9 3H3v18h6M9 12h13m-5-5 5 5-5 5",
  lock: "M5 10h14v12H5zM8 10V6a4 4 0 0 1 8 0v4M12 15v3",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
  build:
    "M14 3a6 6 0 0 0-7 8L2 17a3 3 0 0 0 5 4l6-7a6 6 0 0 0 8-7l-4 4-4-4 1-4Z",
  flash_on: "M13 2 3 14h8l-1 8 11-13h-8l0-7Z",
  computer: "M2 3h20v14H2zM12 17v4M7 21h10",
  download: "M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6",
  restart_alt: "M3 11a9 9 0 1 1 2 7M3 3v8h8",
  ac_unit: "M12 2v20M3 7l18 10M3 17 21 7M8 3l4 4 4-4M8 21l4-4 4 4",
  local_laundry_service:
    "M4 2h16v20H4zM4 7h16M8 14a4 4 0 1 0 8 0 4 4 0 1 0-8 0M7 4h.01",
  local_parking: "M7 22V2h6a6 6 0 0 1 0 12H7",
  fitness_center: "M6 6v12M2 9v6M18 6v12M22 9v6M6 12h12",
  restaurant: "M4 2v7h6V2M7 2v20M20 2c-5 2-5 10 0 10V2Zm0 10v10",
  shower:
    "M4 22V7a5 5 0 0 1 9-3M11 6l5-3 4 5-9 3V6ZM13 14v2m5-3v2m-7 4v2m6-3v3",
  cleaning_services: "m14 2-4 12M4 14h12l4 8H2l2-8ZM7 17v5m5-5v5",
  push_pin: "M8 2h8l-1 8 4 4H5l4-4-1-8ZM12 14v8",
};
const aliases = {
  pending: "schedule",
  cancel: "close",
  email: "mail",
  power: "flash_on",
  add_business: "storefront",
  delete_sweep: "delete",
  done_all: "check",
};

export default function Icon({ children, className = "", ...props }) {
  const name = String(children).trim();
  return (
    <svg
      className={`owner-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[aliases[name] || name] || paths.info} />
    </svg>
  );
}
