# RentalWorks (RentBro): Project Handoff

For any developer or AI agent picking up this project. Last updated: 25 November 2026.

**Read this first, then only the section for your dashboard (section 8).**
`RentalWorks_Analysis.md` explains the backend, database and business rules in depth. Its **frontend sections (5, 6.4, 6.5, 8 and parts of 11 and 12) describe the app before the Redux conversion**. Where the two disagree about the frontend, this file is right.

---

## 1. What the project is

A PG (Paying Guest) accommodation platform. Visitors find a PG, book a bed and pay. They become tenants, then wardens, owners and admins run the place.

| Role | What they do | Home URL |
|---|---|---|
| visitor / `guest` | Browse, sign up, book | `/listings` |
| `tenant` | Pay rent, raise issues and complaints, request services | `/dashboard/tenant` |
| `warden` | Rooms, tenants, rent ledger, violations, complaints | `/dashboard/warden` |
| `owner` | Own properties, issues, policy | `/dashboard/owner` |
| `admin` | Users, property approval, bookings, payments, announcements | `/dashboard/admin` |
| `super_admin` | Platform overview, regional admins, announcements | `/dashboard/superadmin` |

**Main journey:** Landing → Listings → PG details → (sign up or log in) → Roommate match (shared rooms only) → Review → Payment → Confirmed → Tenant dashboard.

**Stack:** React 19, Vite 8, Redux Toolkit 2, React-Redux 9, React Router 7, plain JavaScript. Backend: NestJS 11, TypeORM, PostgreSQL (Neon).

```
3_Rentalworks/
├── back-end/                         NestJS API, port 3000 (DO NOT EDIT, see rules)
├── front-end-react/pg-listing-react/ THE APP. All work happens here
├── front-end/                        old plain HTML/JS version, reference only
├── RentalWorks_Analysis.md           backend, database and business analysis
└── PROJECT_HANDOFF.md                this file
```

## 2. Rules

1. **React, Redux and JavaScript only.** Do not edit `back-end/`. The project owner asked for this. If a feature needs a backend change, work around it in the frontend or report it.
2. **All server calls go through `src/services/apiClient.js`.** No `fetch()` in pages.
3. **Shared or server data lives in Redux.** Keep `useState` for local things: form text, open modal, search box.
4. **No `localStorage` or `sessionStorage` in pages.** Only `authStorage.js` (session) and `bookingSlice.js` (booking draft) use them.
5. **Never show success before the server confirms.** No fake data, hard-coded IDs (`|| 1`) or invented names.
6. **No `alert()`.** Use the toast system. `window.confirm` is fine before deleting.
7. **Links use full paths**, for example `/dashboard/warden/rooms`.
8. **Send only fields the backend DTO lists.** It uses `forbidNonWhitelisted`, so one extra field gives a 400. Check `back-end/src/<module>/*.dto.ts`.
9. **A passing build is not proof.** An earlier slice bug crashed the whole app while the build passed. Check in a browser.

## 3. How to run

```bash
# Terminal 1: backend
cd 3_Rentalworks/back-end
# create .env from .env.example: DATABASE_URL and SUPER_ADMIN_TOKEN_SECRET (long random text)
npm install
npm run start:dev          # http://localhost:3000, Swagger at /api

# Terminal 2: frontend
cd 3_Rentalworks/front-end-react/pg-listing-react
npm install
npm run dev                # normally http://localhost:5173
npm run build              # production build
npm run lint               # oxlint
node scripts/owner-render-check.mjs   # renders every owner page
```

To use another API address, set `VITE_API_URL` in a frontend `.env`. If `.env` files are shared, keep the real values out of git.

---

## 4. Frontend structure

```
src/
├── main.jsx → App.jsx         Provider(store) > BrowserRouter > AppRoutes + ToastHost
├── app/
│   ├── store.js               store, session saving, sync between browser tabs
│   ├── rootReducer.js         joins all slices; logout clears user data
│   └── hooks.js               runThunk(), useFetchOnMount(), useAppDispatch/Selector
├── services/apiClient.js      http.get/post/put/patch/delete, auth headers, errors
├── features/                  ALL REDUX CODE
│   ├── shared/createResourceSlice.js   builds a list/create/update/delete slice
│   ├── auth/                  authSlice.js, authStorage.js
│   ├── ui/uiSlice.js          toasts
│   ├── listings/              listingsSlice.js, listingMappers.js
│   ├── booking/bookingSlice.js
│   ├── tenant/tenantSlices.js
│   ├── warden/                wardenSlices.js, wardenMappers.js
│   ├── admin/adminSlices.js
│   ├── owner/ownerSlices.js
│   └── superadmin/superAdminSlice.js
├── routes/AppRoutes.jsx       every URL
├── components/                shared public UI (Navbar, FilterPanel, RoleProtectedRoute, ...)
├── pages/                     public and booking pages, Login, Register
├── dashboards/{tenant,warden,owner,admin,superadmin}/   layout, components, pages
└── data/faqs.js               static FAQ text
```

### State keys

| Key | Holds |
|---|---|
| `auth` | `user`, `token`, `status`, `error`, `profileStatus`, `sessionExpired` |
| `ui` | `toasts` |
| `listings` | properties, rooms, detail, filters, search, city |
| `booking` | chosen PG/room/roommate, dates, friend details, checkout, lastConfirmed, myBookings, myTransactions |
| `tenantIssues`, `tenantComplaints`, `tenantServiceRequests`, `tenantServicesCatalog`, `tenantPayments`, `tenantNotifications` | resource slices |
| `tenantRent`, `tenantStay` | rent dues; active booking |
| `warden` | rooms, tenants, complaints (includes issues), notifications, violations, ledger, tenantLedger |
| `adminUsers`, `adminProperties`, `adminBookings`, `adminPayments`, `adminComplaints`, `adminNotifications` | resource slices |
| `owner` | properties, issues, notifications, policy, profile, subscription |
| `superAdmin` | overview, profile, status, saving |

### Data flow

```
Button click → dispatch(thunk) → apiClient → backend
                                     ↓
              slice updates → useSelector → page re-renders → toast
```

---

## 5. Building blocks to reuse

**Call a thunk and show a toast** (`app/hooks.js`):
```js
const { ok, data, error } = await runThunk(dispatch, someThunk(arg), { success: 'Saved' });
if (ok) closeModal();     // failures already show an error toast
```

**Create a resource slice:**
```js
export const adminUsers = createResourceSlice({
  name: 'adminUsers',               // must equal its key in the store
  api: { list, create, update, remove },
  mapItem: (raw) => raw,            // optional
});
// thunks:    fetchAll(arg) createItem(data) updateItem({ id, changes }) removeItem(id)
// selectors: selectItems selectIsLoading selectError selectMutating selectById ...
```
Inside a slice builder use only **one** `addCase` per action type. Use `addMatcher` for shared flags, after all `addCase` calls. Breaking this crashes the app at startup.

**Toasts:** `toastSuccess(msg)`, `toastError(msg)`, `toastInfo(msg)` from `features/ui/uiSlice`. Warden (`useWardenToast`), admin (`useToast`) and super admin (`useSuperAdminToast`) have a `(type, title, message)` version.

**Auth:** `selectCurrentUser`, `selectIsAuthenticated`, `ROLE_HOME`, and the thunks/actions `login`, `registerGuest`, `registerOwner`, `refreshProfile`, `updateMyProfile`, `changeMyPassword`, `logout`.

**Page protection:** `<RoleProtectedRoute role="warden">` or `allowedRoles={[...]}`. Logged out goes to `/login` and returns afterwards. Wrong role goes to that user's own portal.

**Session:** one localStorage key, `rentbro_session`, holding `{ user, token }`. The booking draft is in sessionStorage as `rentbro_booking_draft`.

**API headers added automatically:** `x-user-id`, `x-role`, and `Authorization: Bearer` when there is a token. Only owner and super admin get a signed token.

---

## 6. What has been done

**Redux foundation:** store, slices for every feature, one API client, one session key, global toasts, role guard, sync between tabs, logout that clears user data.

**Converted to Redux:** all public and booking pages, login and registration, and all five dashboards. The old Context providers are gone.

**Removed:** duplicate admin, super admin and tenant login pages; `AuthContext`, `BookingContext`, `AuthModal`, `ProtectedRoute`, `utils/auth.js`, mock listings, unused components and CSS. The shared login is now `src/pages/Login.jsx`.

**Bugs fixed**

| Problem | Fix |
|---|---|
| Whole app crashed at startup (double `addCase`) | Matchers in `createResourceSlice` |
| Signing up with someone's email logged you in as them | App now signs in with the password after registering (frontend only, see section 9) |
| Tenant and admin "password updated" saved nothing | `changeMyPassword` checks the old password, then saves |
| Warden escalate, remark and severity saved only locally or nowhere | Now call the API. Severity is saved as `priority` |
| Warden setting a room "Vacant" wiped real occupancy | Occupancy is read-only; maintenance and rent are editable |
| Warden complaints and issues with the same ID clashed | Rows identified by `entityType-id` |
| Warden rooms always added to property 1 | Property picker |
| Admin dashboard called functions that no longer existed | Uses slices and selectors |
| Admin refund was only a message | Saves `status: refunded` (no real money moves) |
| Admin-created users all got the same default password | Admin sets a temporary password |
| Admin created properties with owner 1 and a typed name | Real owner picker |
| Admin and warden quick actions pointed to wrong URLs | Correct paths |
| Unpaid booking "Complete Payment" was broken | Resumes the booking flow, then removes the old request |
| Booking for a friend changed your own session | Friend gets their own account; you stay signed in |
| Guest could not save gender (API blocks guests) | Kept in session, saved at checkout |
| Fake reviews, activity feeds, charts and stats | Real data or an empty state |

**Removed because the backend does not support it:** announcement scheduling in the admin portal, the fake document preview, and listing filters without data (distance, deposit, veg-only).

## 7. What has been tested

Tested 25 November 2026 in headless Chrome against the real backend code on a temporary local PostgreSQL database. Two setup flags were changed in that copy only. Production Neon was not used.

| Area | Status |
|---|---|
| Signup, login, returning to the chosen room, role guards, old URL redirects | Passed |
| Roommate match, review, UPI / card / net banking, confirmation, refresh | Passed |
| Booking for a friend, girls-only block, resume unpaid booking | Passed |
| Tenant: pages, issue, complaint, service, notifications, profile, password, rent payment | Passed |
| Warden: pages, rooms, violations, complaints, notify, waive, add/edit tenant, profile | Passed |
| Warden: evict, mark cash paid, delete tenant, change password | **Not clicked** |
| Admin: pages, users, approve/edit/add property, refund, announcement, password | Passed |
| Admin: reject, notice period and remove property; approve/reject/terminate booking; complaint buttons | **Not tested** |
| Owner: all pages open; policy, profile and password save | Passed |
| Owner: add/edit/delete property, issue and notification actions | **Not tested** |
| Super admin: all pages open | Passed |
| Super admin: add/edit regional admin, announcement, profile, password | **Not tested** |

---

## 8. Dashboard guide

Each dashboard can be worked on separately. "Files" lists what you normally touch.

### 8.1 Tenant
- **Files:** `dashboards/tenant/`, `features/tenant/tenantSlices.js`
- **Loads in:** `TenantLayout.jsx` (profile, stay, notifications). Pages load the rest.
- **Helper:** `useTenant()` gives `{ tenant, activeBooking, loading }`
- **Pages:** dashboard, issues, notifications, complaints, services, payments, profile
- **APIs:** `/issues/my`, `/complaints/my`, `/service-requests/my`, `/services`, `/payments`, `/rent-dues/my`, `/rent-dues/:id/pay`, `/notifications`, `/bookings`
- **Note:** rent amount always comes from the server's ledger, never the browser.
- **Ideas:** complaint attachment upload (`POST /complaints/:id/upload-attachment`), avatar upload (`POST /users/upload-avatar`), service scheduling (`scheduledAt`).

### 8.2 Warden
- **Files:** `dashboards/warden/`, `features/warden/wardenSlices.js`, `wardenMappers.js`
- **Loads in:** `WardenLayout.jsx` dispatches `fetchWardenData()` once for everything.
- **Helpers** (`utils/dataStore.js`): `useWardenData()`, `useWardenRun()` (runs a thunk, throws on error), `useWardenToast()`
- **Pages:** dashboard, tenants, rooms, violations, complaints, notifications, profile
- **APIs:** `/rooms`, `/tenants`, `/complaints`, `/issues`, `/warden-notifications`, `/rule-violations`, `/rent-dues/ledger`, `/rent-dues/:id/mark-paid`, `/rent-dues/:id/waive`, `/warden-actions/...`
- **Note:** complaint timeline notes last only for the session; the API has no timeline field. Wardens have no property link in the user table, so the "property" shown comes from the rooms they can see.
- **To do:** test evict, mark cash paid and delete tenant. Manage service requests (`GET` and `PATCH /service-requests`), which no page shows to wardens yet.

### 8.3 Owner
- **Files:** `dashboards/owner/`, `features/owner/ownerSlices.js`
- **Loads in:** `OwnerLayout.jsx`, which refreshes every 30 seconds and on window focus.
- **Pattern:** pages receive props from the `Owner...Route` functions at the bottom of `OwnerLayout.jsx`. Add a thunk with `ownerMutation(...)`, then pass it down with `useAction(...)`.
- **Pages:** dashboard, properties, add-property, issues, notifications, policy, profile, subscription
- **APIs:** all under `/api/...`, and they need the signed token.
- **To do:** test property, issue and notification actions. Subscription is display-only: there is no online checkout. Image upload endpoint: `POST /properties/:id/upload-image`.

### 8.4 Admin
- **Files:** `dashboards/admin/`, `features/admin/adminSlices.js`, `services/api.js`
- **Pattern:** `adminX.thunks...` with `runThunk`; read with `adminX.selectors...`
- **Pages:** dashboard, users, properties, bookings, payments, subscriptions, complaints, notifications
- **APIs:** `/users`, `/properties`, `/bookings`, `/payments`, `/complaints`, `/notifications`
- **Note:** `services/api.js` picks the allowed fields. If a new field does not save, add it there. Subscriptions are worked out from owner accounts. Users with linked records cannot be deleted, so suspend them.
- **To do:** test the items in section 7. Possible: services catalogue editor (`/services`), audit log page (`/warden-actions/audit-logs`).

### 8.5 Super admin
- **Files:** `dashboards/superadmin/`, `features/superadmin/superAdminSlice.js`
- **Loads in:** `SuperAdminLayout.jsx` dispatches `fetchSuperAdminOverview()`. Most pages read `superAdmin.overview`.
- **Pattern:** thunks made with `mutate(...)` reload the overview after saving.
- **Pages:** dashboard, regional-admins, global-reports, notifications, profile
- **APIs:** `/super-admin/...`, and they need the signed token.
- **To do:** test every form. Check whether its "schedule" option really delays sending; this was not verified.

### 8.6 Public and booking
- **Files:** `pages/`, `components/`, `features/listings`, `features/booking`
- **Note:** only `approved`, `verified` or `active` properties are public. The deposit is 40% of rent and the platform fee is ₹500 (`PLATFORM_FEE`). Payment is test mode.

---

## 9. Known limits

**Security, needs backend work before going live**
- The API trusts `x-role` and `x-user-id` sent by the browser. Anyone can fake them. Only owner and super admin routes verify a token.
- `POST /users/guest-register` returns an existing account without a password check.
- `PUT /users/:id` lets any listed role edit any user, and does not check the old password.
- `GET /bookings` and `GET /payments` return everyone's records if no filter is sent.

**Missing in the backend:** real payment gateway, scheduling in the admin announcements API, document storage, complaint timeline, forgot password, guest profile update, public support tickets (the landing page opens email instead), and email/SMS sending was not seen.

**Frontend**
- The bundle is about 840 KB. Lazy-loading each dashboard in `AppRoutes.jsx` would help.
- There are no automated tests apart from `owner-render-check.mjs`.
- CSS is separate per dashboard. Keep the `portal-<role>-scope` wrapper so styles do not leak.
- Owner and super admin still use old-style prop passing with Redux underneath. This works; do not rewrite without reason.

---

## 10. How to add a feature

Example: warden service requests page.

1. **Check the API.** Find the controller and DTO in `back-end/src/service-requests/`. Confirm your role is in `@Roles` and note the allowed fields.
2. **Add API wrappers** in `dashboards/warden/utils/api.js`.
3. **Add thunks, reducers and selectors** in `features/warden/wardenSlices.js`. For a plain list, use `createResourceSlice` and add it to `wardenReducers`.
4. **Create the page** in `dashboards/warden/pages/`, with loading, empty and error states.
5. **Add the route** in `routes/AppRoutes.jsx` and the **sidebar link**.
6. **Check it:** build, lint, then click it in the browser with the console and network tab open.

**Before you finish**
- [ ] No console errors and no unexpected 4xx or 5xx calls
- [ ] Refreshing the page keeps the data
- [ ] Logging in as another role cannot open it
- [ ] Buttons are disabled while saving
- [ ] Section 7 and section 8 of this file are updated

## 11. Splitting work between people

Give each person one dashboard folder plus its matching `features/<role>` file. Tell each other before editing these **shared files**:

`app/*`, `services/apiClient.js`, `features/shared/*`, `features/auth/*`, `features/ui/*`, `routes/AppRoutes.jsx`, `package.json`

The Git repository is `3_Rentalworks`. This work is on `redux-migration`. Create one branch per dashboard from it (for example `warden-service-requests`; do not use `feature/...`, because a branch named `feature` already exists) and open a pull request.

**Prompt to give another AI agent**

> Read `3_Rentalworks/PROJECT_HANDOFF.md` fully before changing anything. I am working only on the **[tenant / warden / owner / admin / superadmin]** dashboard. Task: **[describe it]**. Follow the rules in section 2 (React, Redux and JavaScript only, no backend edits), reuse the building blocks in section 5, and stay inside the files listed for my dashboard. Check the backend DTO before sending data. Test in a browser and tell me honestly what you tested and what you did not. Update sections 7 and 8 when done.

---

## 12. Endpoint quick list

`Open` means no role check. Roles are from the backend `@Roles`.

| Area | Endpoints | Roles |
|---|---|---|
| Auth | `POST /users/login`, `/users/guest-register`, `/users/owner-register` | Open |
| Users | `GET /users` | admin, warden, super_admin |
| | `POST`, `DELETE /users` | admin, super_admin |
| | `GET`, `PUT /users/:id` | all except guest |
| Properties | `GET /properties`, `/properties/:id` | Open |
| | `POST`, `PUT`, `DELETE` | admin, owner |
| Rooms | `GET /rooms` | Open |
| | `POST`, `PUT`, `DELETE` | admin, warden |
| Bookings | `POST /bookings/checkout` | Open |
| | `GET /bookings` | all roles |
| | `PUT /bookings/:id` | admin, warden |
| | `DELETE /bookings/:id` | admin, tenant |
| Roommates | `POST /roommates/profile`, `/roommates/calculate-matches` | Open |
| Payments | `GET /payments` | all except guest |
| | `PUT /payments/:id` | admin, owner, super_admin |
| Rent dues | `GET /my`; `POST /:id/pay` | tenant, admin (`/my` also warden) |
| | `GET /ledger` | warden, admin, owner |
| | `POST /:id/mark-paid`, `/:id/waive`, `/run-check` | warden, admin |
| Complaints | `GET /my`; `POST`; `DELETE` | tenant, admin (`POST` and `DELETE` also owner; `/my` also super_admin) |
| | `PUT /:id` | admin, warden, owner |
| Issues | `GET /my`, `POST`, `DELETE` | tenant, admin, super_admin |
| | `GET /issues` | admin, warden, owner, super_admin |
| | `PATCH /:id` | all except guest |
| Service requests | `GET /my`, `POST`, `DELETE` | tenant, admin, super_admin |
| | `GET` (all) | admin, warden, owner, super_admin |
| | `PATCH /:id` | all except guest |
| Services | `GET` | all except guest |
| | `POST`, `PATCH`, `DELETE` | admin, owner, super_admin |
| Notifications | `GET`, mark read | all except guest |
| | `POST`, `DELETE` | admin, warden, owner |
| Warden notifications | `GET` | admin, warden, owner |
| | `PUT`, `DELETE` | admin, warden |
| Rule violations | `GET` | admin, warden, owner |
| | `POST`, `PUT`, `DELETE`, `/:id/warning`, `/:id/escalate` | admin, warden |
| Warden actions | `POST /tenants/:id/notify`, `/escalate`, `/evict` | warden, admin |
| | `GET /audit-logs` | warden, admin, owner |
| Tenants | `GET`, `POST`, `PUT`, `DELETE /tenants` | admin, warden |
| Owner portal | `/api/dashboard/stats`, `/api/properties`, `/api/issues`, `/api/notifications`, `/api/policies`, `/api/profile`, `/api/subscription` | signed token (OwnerGuard) |
| Super admin | `/super-admin/overview`, `/regional-admins`, `/profile`, `/password`, `/announcements` | signed token |

Full interactive list: `http://localhost:3000/api` while the backend runs.
