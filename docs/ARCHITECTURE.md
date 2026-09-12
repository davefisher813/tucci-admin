# ARCHITECTURE
Verified against the repo on September 11, 2026 (commit db6ac8a). Lines marked (unverified) could not be confirmed from the code.

## Stack

- Next.js 16.2 App Router (`src/app`), React 19, TypeScript 5.7, Tailwind 3.4 (`package.json`).
- Supabase via `@supabase/ssr` 0.5 and `@supabase/supabase-js` 2.45. Project ref `nllphbsdcaiwemushmoh` (`README.md`, `.env.local.example`). Tier and region: (unverified). Upgrade to Pro plus PITR before real customer and payment data.
- `xlsx` 0.18 for the Excel backup export (`src/app/api/backup/excel/route.ts`).
- No Stripe npm package. No test runner. No ESLint config file in the repo.
- Hosting: Vercel, per `README.md`. Live at tucci-admin.vercel.app (responds with a redirect to `/login`). No `vercel.json`.

## Folders

- `src/app/(admin)/` staff screens behind `requireRole()` in `layout.tsx`.
- `src/app/api/` route handlers: `stripe/webhook`, `backup/excel`, `backup/json`, `reports/csv`.
- `src/app/kiosk`, `login`, `signup`, `set-password`, `unauthorized`, `auth/confirm`.
- `src/components/admin/` one component per screen plus `AdminShell`, `Sidebar`, `Topbar`, `FacilityMap`, `ScheduleGrid`, `EditBookingModal`, `NewBookingForm`.
- `src/lib/auth/` `guard.ts` (roles, `requireRole`, `requireOwner`, `requireAdmin`) and `actions.ts`.
- `src/lib/data/` server actions, one file per domain (`booking-actions.ts`, `bulk-booking-actions.ts`, `family-actions.ts`, and so on).
- `src/lib/supabase/` `server.ts`, `client.ts`, `admin.ts` (service role), `middleware.ts` (session refresh).
- `src/lib/stripe/server.ts` plain REST client.
- `src/lib/db/types.ts` is a placeholder (`Record<string, never>`); the gen-types Action has never produced real types.
- `migrations/` holds only `034_booking_paid.sql`.

## Auth and roles

- `UserRole` is `owner | admin | coach | reception | family` (`src/lib/auth/guard.ts:5`).
- `STAFF_ROLES` excludes family. `(admin)/layout.tsx` calls `requireRole()` so family lands on `/unauthorized`.
- Accounts and Backup are owner only (`accounts/page.tsx:8`, `backup/page.tsx:8`). Audit Log is owner and admin (`audit-log/page.tsx:23`). The UI labels the `owner` role "Manager" (`src/lib/data/account-types.ts:18`).
- Middleware runs `updateSession` on every non-static request (`src/middleware.ts`).

## Data

Tables used from code: bookings, booking_athletes, booking_types, users, families, athletes, coach_profiles, services, service_categories, payments, memberships, promo_codes, assets, asset_types, asset_zones, zones, space_coverage, facility_hours, facility_peak_window, stripe_events, waivers, document_signatures, audit_log. RPCs: `check_in_booking`, `set_space_coverage`, `set_space_splittable`. Storage bucket: `waivers`.

- `bookings.recurrence_group_id` is written by `createBulkBookings` (`src/lib/data/bulk-booking-actions.ts:121`) and read for series edits.
- `bookings.coach_name` supports name-only coaches (`bulk-booking-actions.ts`, `EditBookingModal.tsx:32`).
- `bookings.paid_at`, `bookings.paid_method` come from migration 034.
- `families.client_type`, `sport`, `point_of_contact` (`src/lib/data/family-actions.ts:13-28`).
- `booking_types.color` drives grid tile color (`src/components/admin/ScheduleGrid.tsx:201`).
- Service categories live in `service_categories` (`src/lib/data/category-actions.ts:25`).
- Fields sit over cages via `space_coverage` (`src/lib/data/resources.ts:115`).

## Migrations

- Only `migrations/034_booking_paid.sql` is in the repo. Code comments reference migration 019 (user_role enum, `guard.ts:4`) and 022 (`check_in_booking`, `checkin-actions.ts:9`). The rest of the history (001 through 033) is not in this repo. Copies of 001 through 013 exist in `tucci-platform.zip` in Dave's Downloads, and 018 through 022 exist there as loose files. Which are applied to the live database: (unverified).
- The pgserver harness (`db_tools/test_migrations.py`, `bootstrap.sql`, `prereqs.sql`) referenced in earlier sessions is not in this repo and was not found on this machine. Until it is added, test SQL on a Supabase preview branch or a throwaway Postgres before applying.
- `.github/workflows/gen-types.yml` triggers on `supabase/migrations/**`, a path that does not exist, so it only runs by manual dispatch.

## Environment variables

Read by code: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_FAMILY`, `STRIPE_PRICE_TEAM` (`membership-actions.ts:16-19`), `NEXT_PUBLIC_APP_URL` (checkout return URLs, defaults to the live URL), `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_VERCEL_URL` (`account-actions.ts:13-14`). No publishable Stripe key is used. GitHub secrets for the type Action: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. Never commit values.

## Stripe

- `src/lib/stripe/server.ts`: `stripeRequest()` over `https://api.stripe.com/v1` with form encoding and idempotency keys; `getOrCreateStripeCustomer()` saves `families.stripe_customer_id`.
- Memberships: Checkout session in subscription mode with a Price id from env (`membership-actions.ts`).
- Payments: Checkout session in payment mode with inline `price_data` (`payment-actions.ts:29-50`).
- Webhook `src/app/api/stripe/webhook/route.ts`: HMAC signature check with `crypto` (`route.ts:1,36,44`), idempotency via `stripe_events`, handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `customer.subscription.created|updated|deleted` (`route.ts:84-95`).

## Native wrappers

No Capacitor, Electron, push token, or APNs code exists in this repo. The iOS (`tucci-ios`) and desktop (`tucci-desktop`) projects, if they exist, are separate. (unverified)

## Delivery history

`git log` shows GitHub web editor commits ("Update X.tsx", "Add files via upload") and a `PUSH_ALL.ps1` script in the zip deliveries. From now on: normal local commits, Dave pushes.

## Verification

```
npm run lint
npm run typecheck
npm run build
```
Screen check at 390 width and desktop. Migrations: test on a preview branch before applying.
