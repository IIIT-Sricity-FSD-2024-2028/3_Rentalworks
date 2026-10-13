# Super Admin React Portal

This app replaces the five screens linked from the original super admin portal. It keeps the original CSS files and class names. Each screen is a React component in `src/pages/`.

## Run locally

1. Start the backend on `http://localhost:3000`.
2. Run `npm install` once in this directory.
3. Run `npm run dev` and open the address shown by Vite (port 5176).
4. Sign in with a backend super admin account.

To use the shared login page, run `npm run build` first and serve the **repository root** as a static site. The shared login redirects super admins to this app's `dist/index.html` on the same origin, so its session is available to React.

## Where to find things

- `src/App.jsx`: current section, loaded data, and sign-in state.
- `src/components/Shell.jsx`: sidebar, header, logout, and toast.
- `src/pages/`: dashboard, regional admins, global reports, alerts, and profile.
- `src/services/api.js`: backend requests. Set `VITE_API_URL` when the backend is elsewhere.
- `src/services/data.js`: small helpers for local data and report totals.
- `src/styles_admin.css`, `src/morphism-effects.css`, `public/login.css`: unchanged copies of the original styles.

The existing backend has no scheduled-send, verified password-change, or two-factor sign-in endpoint. The schedule list and 2FA switch only save a local preference; the UI says so. Password changes show an explanation rather than claiming success.
