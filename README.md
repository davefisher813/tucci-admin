# tucci-admin

Next.js 15 + Supabase SSR admin for Tucci Elite. Built fresh against live DB
(ref nllphbsdcaiwemushmoh). v6 canonical design tokens.

## Deploy
1. Create new GitHub repo, push this.
2. New Vercel project, import the repo.
3. Vercel env vars (Project Settings > Environment Variables):
   - NEXT_PUBLIC_SUPABASE_URL = https://nllphbsdcaiwemushmoh.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (Supabase > Settings > API > anon public)
4. GitHub repo secrets (for type-gen Action):
   - SUPABASE_ACCESS_TOKEN
   - SUPABASE_PROJECT_REF = nllphbsdcaiwemushmoh
5. Deploy. Sign up on the live URL (018 trigger creates your users row).
6. Promote yourself in Supabase SQL editor:
   update public.users set role='owner' where email='YOUR_EMAIL';

## Local dev
- cp .env.local.example .env.local, fill in the anon key
- npm install
- npm run dev

## What's here
- Auth: signup / login / signout (server actions)
- Middleware session refresh + redirect to /login when signed out
- requireRole() guard; (admin) layout is staff-only, family -> /unauthorized
- Today page reads live bookings (KPI strip + agenda)
- All other admin screens stubbed, ready to wire
