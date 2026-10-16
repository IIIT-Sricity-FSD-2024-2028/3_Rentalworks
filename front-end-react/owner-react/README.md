# RentBro Owner Portal

The owner pages live in `src/pages`. `src/App.jsx` loads their data and handles saves. `src/services/api.js` makes the backend requests. The unified application mounts the portal at `/owner`; the standalone Vite app redirects `/` to that path.

## Run locally

1. Configure and start the NestJS backend from `back-end/README.md`. Set `OWNER_TOKEN_SECRET` to a random value of at least 32 characters.
2. Start the unified frontend with `npm --prefix front-end-react/pg-listing-react run dev`.
3. Sign in with an active owner account at `/login`, then open `/owner`.

The login response contains a signed owner session token. The browser stores it in `sessionStorage` and sends it with owner API calls. The backend verifies the token and uses its owner ID to scope properties, issues, notifications, profile, policy, and subscription requests. An owner cannot choose another owner's ID in a request.

## How the pages work

- **Dashboard:** Calculates occupancy, estimated rent, and issue counts from the loaded properties and issues.
- **Properties:** Lists, adds, edits, and deletes properties through the API. Form validation happens before submission; the backend validates the request too.
- **Issues:** Shows issues for the owner's properties. Status changes and new reports are saved to the backend.
- **Notifications:** Shows the owner's received and sent records. Read and delete actions persist.
- **Policy and Profile:** Load saved values and submit changes to the backend. Password changes verify the current password.
- **Subscription:** Submits a pending plan request. A payment integration is still required before any pending request can be activated.

API errors appear in a toast. Failed changes are not represented as saved data in the browser.

## Checks

```bash
npm --prefix back-end run build
npm --prefix back-end test -- --runInBand
npm --prefix front-end-react/owner-react run build
npm --prefix front-end-react/pg-listing-react run build
```
