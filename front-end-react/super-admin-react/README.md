# Super Admin React Portal

The five super admin screens are React components in `src/pages/`. Their CSS files and existing class names are unchanged. Data and changes come from the NestJS backend and its Neon PostgreSQL database. Browser storage holds only the current sign-in session, never dashboard records.

## Run

1. Set `DATABASE_URL` and a random `SUPER_ADMIN_TOKEN_SECRET` of at least 32 characters in `back-end/.env`. Never commit that file.
2. In `back-end`, run `npm install` and `npm run start:dev`.
3. In this directory, run `npm install` and `npm run dev`. Vite uses port 5176. Set `VITE_API_URL` if the backend is not on `http://localhost:3000`.
4. Sign in with an active `super_admin` row in the `users` table. The login username is the `username` column. If two factor sign-in is enabled, enter the current code from an authenticator app.

The NestJS app applies the additive `SuperAdminAnnouncements1800000000000` migration when it starts. It adds audience and delivery fields to `notifications`, plus two factor fields to `users`. Existing users, properties, payments, and notifications remain in their existing tables.

The shared backend currently has TypeORM `synchronize: true` from the owner integration. Review its pending schema changes before starting that combined version against a shared database. The super admin migration itself was applied and verified on Neon.

The shared legacy role selector takes Super Admin directly to this React login. For a static build, run `npm run build` and serve the repository root so the link to `dist/index.html` resolves.

## What each screen reads or changes

| Screen | Data | Action |
| --- | --- | --- |
| Dashboard | `users`, `properties`, `payments` | Reads current account, property, and payment figures. Charts use the last six calendar months. |
| Regional Admins | `users` | Creates an admin with a chosen password or changes that admin's region. Email is the new admin's login username. |
| Global Reports | `properties` and their owner `users` | Reads property status and each owner's configured subscription plan and fee. |
| System Alerts | `users`, active `bookings` and `tenant_stays`, `notifications` | Stores an announcement and its recipient user IDs; scheduled announcements become sent when due. |
| Profile | Own `users` row | Updates details and password, and enables or disables authenticator sign-in. |

The database has a configured subscription fee on each owner, but no subscription payment ledger. That amount is shown as a **configured fee**, not a verified payment. Verified commissions come from `payments.platformFee`. No amounts are filled in when database values are missing.

## API routes

`POST /users/login` returns a short lived signed token for an active super admin. All `/super-admin/*` routes require that token and check the current user's role and status in the database. The React app sends the token in `Authorization: Bearer ...`.

- `GET /super-admin/overview`
- `POST /super-admin/regional-admins`
- `PUT /super-admin/regional-admins/:id`
- `GET /super-admin/profile`
- `PUT /super-admin/profile`
- `PUT /super-admin/password`
- `POST /super-admin/two-factor/setup`
- `POST /super-admin/two-factor/confirm`
- `POST /super-admin/two-factor/disable`
- `POST /super-admin/announcements`

The token secret belongs only in the backend environment. The frontend must never contain it.
