# DECISIONS
Newest first.

---

Date: September 11, 2026
Decision: Adopt repo documentation standard and the Plan, Build, Independent Review, Fix workflow. Claude Code commits replace PowerShell push scripts and GitHub web editor uploads.
Reason: Reliable context; fewer delivery failures.
Consequences: `package-lock.json` is not committed today; the first local `npm install` created one. Decide whether to commit it (recommended) so installs are reproducible.

---

Date: (carried forward)
Decision: Stripe via plain REST plus Node crypto, no npm SDK.
Reason: Avoid pasting package-lock.json through the GitHub web editor.
Consequences: Webhook signature verification and API calls are hand-written in `src/lib/stripe/server.ts` and `src/app/api/stripe/webhook/route.ts`; keep them small and tested.

---

Date: (carried forward)
Decision: Waiver and client onboarding is Path C (upload-driven) only.
Alternatives considered: Path A and Path B. Rejected.
Consequences: `/waivers/new` exists. PDF field extraction is not built yet; staff enter fields by hand.

---

Date: (carried forward)
Decision: Crossbar is link-out only. No API integration, no custom messaging.
Consequences: The app builds a copyable confirmation text; nothing is sent from the app.

---

Date: (carried forward)
Decision: Design system v6 locked (Archivo, DM Sans, token palette). Supersedes Inter/Barlow/#0B2A3D.

---

Date: (carried forward)
Decision: Role hierarchy owner > admin > coach > reception > family with RLS. The owner role is labeled "Manager" in the UI.

---

Date: (carried forward)
Decision: Service categories are an editable DB table (`service_categories`).

---

Date: (carried forward)
Decision: Every migration is executed in a test Postgres before shipping. Zip-based delivery is never used.
Consequences: The pgserver harness is not in this repo today. Until it is restored, use a Supabase preview branch or throwaway Postgres.

---
