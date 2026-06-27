# Anayasa

A security-first household management PWA for a two-person household — chores,
shopping, inventory, finance, calendar, health and more — built so that *only*
two whitelisted users can ever see the data, enforced at the database layer.

> **Anayasa** is Turkish for "constitution" — the name reflects the project's
> founding rule: security (auth + Row-Level Security + PIN) is a hard
> prerequisite, never deferred to "later."

## What it does

Anayasa is a private app two people use to run a shared home: assign and track
recurring chores, keep a live shared shopping list, log household inventory,
manage finances (income, fixed costs, category budgets, a savings buffer), plan
calories, track a calendar, and keep personal modules (weight, quit-smoking
streaks, goals) — all installable to an iPhone home screen as a PWA.

What makes it interesting isn't the feature list; it's that the entire thing is
built **security-first**. Sign-up is closed, access is a two-email whitelist plus
a per-device PIN, and every table is guarded by PostgreSQL Row-Level Security so
that even a leaked anon key exposes nothing. The frontend never holds a
privileged credential.

## Tech stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **UI:** shadcn/ui (Radix primitives) + lucide-react, recharts, canvas-confetti
- **Backend:** Supabase — Postgres, Auth, Storage, Realtime, Edge Functions (Deno)
- **Forms / validation:** react-hook-form + zod
- **i18n:** i18next (Turkish / English toggle)
- **PWA:** vite-plugin-pwa (iOS Safari add-to-home-screen)
- **Hosting:** Vercel (with CSP headers)

## Security architecture (the point of the project)

This is the deliberate, load-bearing design — see [`SECURITY.md`](SECURITY.md),
[`infra/rls-policies.sql`](infra/rls-policies.sql) and
[`src/lib/supabase.ts`](src/lib/supabase.ts):

- **No service-role key in the frontend — ever.** The browser client is created
  with the anon/publishable key only. Privileged operations live in Supabase Edge
  Functions ([`supabase/functions/`](supabase/functions/)), which read
  `SUPABASE_SERVICE_ROLE_KEY` from Supabase's secret manager — never from bundled code.
- **Row-Level Security on every table.** Access is gated by an
  `is_household_member()` policy; personal modules add an extra
  `owner_id = auth.uid()` filter so one partner can't read the other's private data.
- **Closed sign-up + whitelist.** Only emails present in `allowed_users` can
  authenticate; a `signup-guard` Edge Function enforces it. There is no public
  registration path.
- **Per-device PIN as a second factor.** A 6-digit PIN (bcrypt-hashed,
  server-verified via the `verify-pin` Edge Function) sits on top of email login,
  with lockout after repeated failures and an optional 7-day "remember this device."
- **Signed, scoped storage.** Uploaded images (e.g. incident photos) are served
  through Supabase Storage with access scoped to household members.

## Modules

`chores` · `personal-tasks` · `inventory` · `shopping` · `incidents` ·
`finance` · `calories` · `calendar` · `body` (weight tracking) · `smoking`
(quit-smoking tracker) · `goals` — each under [`src/modules/`](src/modules/).

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env          # add your Supabase URL + anon key

# 3. Provision the database (Supabase Dashboard > SQL Editor), in order:
#    infra/schema.sql  ->  infra/rls-policies.sql  ->  infra/seed.sql
#    (seed.sql uses placeholder UUIDs/emails — fill in your own users)

# 4. Run
npm run dev
```

Quality gates: `npm run type-check`, `npm run lint`, `npm run format`.

## Status

Personal / portfolio project (v1.0.0). Built and used for a real household;
published to demonstrate the security-first architecture rather than as a
maintained product. The in-repo `SECURITY.md` is written in Turkish (the original
working language); the security model is summarised above in English.

## License

MIT — see [LICENSE](LICENSE).
