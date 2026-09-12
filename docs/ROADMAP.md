# ROADMAP
Items closed by code on main as of September 11, 2026 have been removed (see CURRENT_STATE).

## Planned

- Restore the migration history into the repo (001 through 033 plus the harness) so schema changes can be tested and reviewed here.
- Fix `.github/workflows/gen-types.yml` to watch `migrations/**` and run it once so `src/lib/db/types.ts` stops being a placeholder.
- Replace the broken `next lint` script with a working ESLint setup.
- Waiver intake: auto-extract fields from the uploaded PDF to pre-fill the form (today staff type everything).
- Kiosk: true self-serve mode that does not require a staff session.
- Title Case sweep (unverified how much remains).
- Update `README.md` (still says Next.js 15 and "all other admin screens stubbed").

## Blocked

- Stripe Terminal in-person charge flow (Stripe account not live).
- Membership checkout testing (Stripe Products and Prices, env vars, webhook registration).
- App Store submission (separate iOS project; Apple Developer enrollment).

## Later

- Supabase Pro plus PITR at launch.
- Parent-facing FAQ content surfaced in-app.
- Dark theme toggle (tokens exist in `globals.css`; layout hardcodes light).

## Not planned

- Custom messaging (Crossbar link-out only).
- GymMaster integration.
- Stripe npm SDK.
