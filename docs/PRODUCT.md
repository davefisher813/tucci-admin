# PRODUCT

## What it is

A custom facility management admin app for an indoor baseball and softball training facility: scheduling of cages, gym, bullpen lanes, and fields; bookings; check-in; clients and athletes; coaches; pricing and promo codes; payments and memberships via Stripe; payroll; reports; backup; audit log.

## Who it serves

Facility staff. Roles: owner (shown as Manager; Alberto, Dave), admin, coach (Mike Carter, Hathaway Roper), reception (Jenna), family (default for signups). Names are business facts, not in code. Athletes and families check in at the kiosk held by staff.

## Facility layout

Gym, Cages 1 through 7 (each splittable top and bottom), outdoor bullpen lanes 8 and 9, Field 1 over the top row, Field 2 over the bottom row (`FacilityMap.tsx:18-41`).

## Main flows

1. Today: KPI strip (Sessions, Revenue, Checked In) and agenda.
2. Schedule: desktop grid; phone Agenda with a Grid toggle. Booked lanes grey out live on the Facility Map.
3. New Booking: multi-select spaces, half-cage splits, recurrence, Block Off mode, inline add panels for clients and coaches, client autocomplete.
4. Bookings list with multi-cancel and paid tracking; Edit Booking is series-aware with No-Show and fee entry and a copyable confirmation.
5. Check-In and Kiosk (`/kiosk`).
6. Clients (families with client type, sport, point of contact), Athletes, New Waiver (`/waivers/new`), Coaches.
7. Payments (Stripe Checkout link), Memberships (subscription checkout), Pricing, Payroll, Promo Codes, Reports (CSV export), Space Value.
8. System: Settings (cages, categories, hours), Accounts and Backup (owner), Audit Log (owner and admin), Global Search (`/search`).

## Native wrappers

Not in this repo. Earlier sessions describe an iOS Capacitor project ("Tucci Elite", push, haptics, share, Codemagic builds) and an Electron desktop wrapper loading the live site. (unverified)

## Intended experience

Calm, Mindbody-style lists. One bold element per row. Staff can edit anything they can see. Reception can run the front desk from a phone.
