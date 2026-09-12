# CURRENT STATE
Last Updated: September 11, 2026. Rewritten from `git log`, the file tree, and a live check of the deployed URL.

## PRIORITIES

1. Confirm migration 034 (`bookings.paid_at`, `paid_method`) is applied to the live database; the Bookings paid tracking on main depends on it.
2. Stripe go-live prerequisites (Dave).
3. Restore the migration history and harness into the repo; fix the gen-types workflow path.
4. Fix `npm run lint`.

## ACTIVE

Main is at db6ac8a (July 9, 2026), clean, in sync with origin. No commits since. Every route in the app builds and every screen has real code (no stubs): Today, Schedule, New Booking, Bookings, Check-In, Kiosk, Clients, Athletes, New Waiver, Coaches, Payments, Memberships, Pricing, Payroll, Promo Codes, Reports, Space Value, Settings (Cages, Categories, Hours), Accounts, Backup, Audit Log, Search.

Confirmed on main (previously listed as staged but unconfirmed)
Block Off and calendar multi-select: `NewBookingForm.tsx` (1632 lines), `ScheduleGrid.tsx` (1339 lines), `schedule/page.tsx`. Client fields rework: `family-actions.ts`, `ClientsManager.tsx`, `EditBookingModal.tsx`. Also on main: Global Search, Audit Log, No-Show and fees, copyable booking confirmation, client autocomplete, paid tracking, 24 hour grid, mobile Grid and Agenda toggle.

Stripe
Status: Code complete, untestable without a live account.
Next (Dave): create the Stripe account; create Monthly, Family, Team Products and Prices; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_FAMILY`, `STRIPE_PRICE_TEAM` in Vercel; register the webhook at `/api/stripe/webhook`. Confirm the tables the webhook writes (`stripe_events`, `payments`, `memberships`, `families.stripe_customer_id`) exist in the live schema.

Deployed
tucci-admin.vercel.app answers and redirects to `/login`.

## WAITING

Stripe account (Dave). Apple Developer enrollment (Dave, for the separate iOS project).

## ISSUES

- `npm run lint` fails: `next lint` was removed in Next 16 and the script errors with "Invalid project directory ... \lint". No ESLint config file exists. Typecheck and build pass on untouched code.
- `npm run build` rewrites `tsconfig.json` (`jsx` set to `react-jsx`). Reverted after the doc pass; decide whether to commit that change.
- Migrations: only `migrations/034_booking_paid.sql` is in the repo. Code depends on at least 019 (roles enum) and 022 (`check_in_booking`) plus the tables listed in ARCHITECTURE. Which migrations are applied to the live database is unverified; do not connect to the live database without Dave. Copies of 001 through 013 and 018 through 022 exist in Dave's Downloads outside the repo. 014 through 017, 023 through 033, and 035 were not found anywhere on this machine.
- The pgserver migration harness (`db_tools/`) is not in the repo or on this machine.
- `.github/workflows/gen-types.yml` watches `supabase/migrations/**`, which does not exist. `src/lib/db/types.ts` is still the placeholder.
- No `package-lock.json` is committed. `npm install` produced one locally (not committed in this pass).
- `README.md` is stale: says Next.js 15 and that most screens are stubbed.
- No push notification, Capacitor, or Electron code is in this repo. If `tucci-ios` and `tucci-desktop` exist they are separate and their state is unverified.
- Kiosk requires a staff session, so self-serve check-in is staff-held only.
- Title Case sweep: extent of remaining lowercase labels unverified.
- Waiver intake has no PDF field extraction; staff type the fields.

## RECENT DECISIONS

9/11 Repo doc standard adopted; local commits replace PowerShell scripts and web editor uploads. See DECISIONS.md.
