# BUSINESS RULES
Each rule is checked against code (file:line). Names of real people are business facts, not in code. (unverified)

## Roles and access

- Roles: owner > admin > coach > reception > family (`src/lib/auth/guard.ts:5`). Signups default to family; families are bounced from staff screens (`(admin)/layout.tsx:10`).
- The `owner` role is shown to users as "Manager" (`account-types.ts:18`). Alberto and Dave are owner. Jenna is reception. Coaches are coach. (unverified)
- Owner only: Accounts, Backup (`accounts/page.tsx:8`, `backup/page.tsx:8`, `Sidebar.tsx:57-60`). Membership checkout also requires owner (`membership-actions.ts:31`).
- Owner and admin: Audit Log (`audit-log/page.tsx:23`).
- RLS on the Supabase side is expected but its policies are not in this repo (migration 007 is in `tucci-platform.zip`, not here). (unverified)

## Payments

- Stripe via plain REST and Node `crypto`. No SDK (`package.json`, `src/lib/stripe/server.ts`).
- Memberships: three tiers, monthly, family, team, as Stripe Price ids in `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_FAMILY`, `STRIPE_PRICE_TEAM` (`membership-actions.ts:16-19`). Missing env returns a friendly error, not a crash.
- One-off payments: Stripe Checkout link with inline `price_data` (`payment-actions.ts:29-50`).
- Webhook verifies the signature, dedupes on `stripe_events`, and handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `customer.subscription.created|updated|deleted` (`webhook/route.ts:44-95`).
- Paid tracking on bookings: `paid_at`, `paid_method` (migration 034).
- No-show and cancellation fees are entered on Edit Booking (`EditBookingModal.tsx:450-485`).
- Stripe Terminal in-person flow is not built and is blocked until the Stripe account is live.

## Bookings

- `createBulkBookings` always writes `recurrence_group_id` (`bulk-booking-actions.ts:121`).
- Edit Booking is series-aware: the user chooses this occurrence or future occurrences (`EditBookingModal.tsx:79-140`).
- Block-off bookings use `booking_type = "blocked"` with no client, coach, or charge; label and notes are joined into `notes` (`NewBookingForm.tsx:715-733`). The grid tile shows the notes text, falling back to "Blocked" (`ScheduleGrid.tsx:889`).
- Booking types carry a color (`booking-type-actions.ts:22`) and the grid uses it (`ScheduleGrid.tsx:201`).
- The only thing that blocks a booking is a real conflict (`NewBookingForm.tsx:43`). Hour caps were removed (commit e0f20d1).
- Cages 1 through 7 are splittable into halves; fields sit over cages via `space_coverage` (`resources.ts:115`).

## Clients and waivers

- Client onboarding is Path C only: staff uploads the signed waiver PDF at `/waivers/new`, enters the family and athlete fields, then the family, athletes, and a `document_signatures` row are created and the PDF is stored in the `waivers` bucket (`waiver-actions.ts:88-110`). Field extraction from the PDF is not implemented; the form says auto-extract would come later (`WaiverIntakeForm.tsx:332-333`). Paths A and B were rejected.
- Families carry `client_type` (default "family"), `sport`, `point_of_contact` (`family-actions.ts:26-28`).

## Check-in

- `check_in_booking` RPC records `check_in_method` as `staff` or `self` (`checkin-actions.ts:13`).
- The kiosk at `/kiosk` requires a signed-in staff session (`kiosk/page.tsx`), so it is a staff-held device, not open self-serve.

## Integrations

- Crossbar: link-out only. Today the only reference is a comment in `EditBookingModal.tsx:229`; the confirmation text is built for pasting into Crossbar, a text, or email. No messaging is sent from the app. Never build custom messaging.
- GymMaster: not in the stack. No references in code.

## Data durability

- Server actions return `{ error }` to the UI rather than throwing (pattern in `payment-actions.ts`, `membership-actions.ts`, `waiver-actions.ts`). Full coverage of every write: (unverified).
- Backup: owner can download JSON or Excel of all tables (`/backup`, `gatherBackup`).
- Free tier has no automatic backups. Upgrade to Pro plus PITR before real customer or payment data. (tier unverified)

## Naming

The facility is "Tucci Elite Athletic Complex" in facility-facing text. In code the app title is "Tucci Elite Admin" and the PWA short name is "Tucci Admin" (`layout.tsx`, `public/manifest.json`). The iOS app display name "Tucci Elite" belongs to the separate iOS project. (unverified)
