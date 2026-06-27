# SECURITY.md — Anayasa

> **Red line.** None of the rules in this file are ever "deferred to later."
> No other module is started until auth + RLS + PIN are fully working.

This document describes the security model. It is the deliberate, load-bearing
design of the project.

---

## 1. Whitelist (only 2 users)

### Table: `allowed_users`
```sql
allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  color_hex text DEFAULT '#3b82f6',
  role text CHECK (role IN ('owner', 'partner')) NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Rules
- Only emails present in this table can sign up / log in.
- New sign-ups in Supabase Auth are **disabled** (`Disable signup`).
- Adding a user is manual: insert into `allowed_users` first, then create the Auth
  user from the Supabase dashboard (or via an owner-only admin page).
- Auth guard: when someone tries to register, an Edge Function checks the whitelist
  and **blocks** anyone who isn't on it.

### `.env` safety
- `SUPABASE_SERVICE_ROLE_KEY` is **never** in the frontend — only in Edge Functions.
- `.env` is gitignored. Only `.env.example` lives in the repo.

---

## 2. PIN layer (6 digits)

### Table: `user_pins`
```sql
user_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,            -- bcrypt(pin), hashed inside the Edge Function
  failed_attempts int DEFAULT 0,
  locked_until timestamptz,          -- 15 min lock after 5 wrong attempts
  remember_device_until timestamptz, -- set if "remember this device for 7 days" is checked
  device_fingerprint text,           -- simple hash (UA + screen + lang)
  updated_at timestamptz DEFAULT now()
);
```

### Flow
1. Email + password login via Supabase Auth → JWT obtained.
2. App opens and checks `user_pins`:
   - If `remember_device_until > now()` and `device_fingerprint` matches → skip the PIN.
   - Otherwise show the 6-digit PIN screen.
3. PIN entered → `POST` to the `/verify-pin` Edge Function:
   - The PIN hash is compared server-side.
   - On failure: `failed_attempts++`; at 5, `locked_until = now() + 15 min` (plus an
     email notification, planned).
   - On success: counter reset, `remember_device_until` set if the user checked the box,
     and a session unlock token is returned.
4. The PIN-unlock state is kept **in memory** on the frontend (not in `sessionStorage` —
   it is cleared when the tab closes).
5. If the app is backgrounded for more than 5 minutes, the PIN is required again.

### PIN rules
- Hash: bcrypt cost 12 (in the Edge Function, Deno `bcrypt-ts`).
- The raw PIN is sent over HTTPS/TLS and compared (hashed) in the Edge Function — the
  hash never lives on the frontend.
- Change PIN: settings → old PIN + new PIN.
- Forgotten PIN: email reset link (Supabase magic link → reset-PIN page) — planned.

### Absolutely never on the frontend
- PIN, PIN hash, or "password" in `localStorage` / `sessionStorage`.
- Sensitive data in `console.log`.
- Env variables in the source map (Vite tree-shakes these in production, but it is checked).

---

## 3. Row-Level Security (RLS)

**RLS is enabled on every table. No exceptions.**

### General pattern (shared data)
```sql
CREATE POLICY "household_read" ON <table>
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM allowed_users)
  );

CREATE POLICY "household_write" ON <table>
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM allowed_users)
  );

CREATE POLICY "household_update" ON <table>
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM allowed_users)
  ) WITH CHECK (
    auth.uid() IN (SELECT id FROM allowed_users)
  );
```

### Pattern (personal data — personal tasks, personal finance, calories, weight, smoking)
```sql
CREATE POLICY "personal_only" ON <table>
  FOR ALL USING (
    owner_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM allowed_users)
  ) WITH CHECK (
    owner_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM allowed_users)
  );
```

### Which modules are personal?
| Module | Scope |
|--------|-------|
| Household chores | Shared (both read/write) |
| Personal tasks | **Personal** |
| Inventory | Shared |
| Shopping | Shared |
| Calories / macros | **Personal** |
| Incident log | Shared (so a partner can file a "complaint") |
| Finance — income / fixed costs / buffer | Shared |
| Finance — dynamic category (`scope='personal'`) | **Personal** |
| Finance — dynamic category (`scope='shared'`) | Shared |
| Calendar | Shared (events carry an `owner_scope` field) |
| Weight / body | **Personal** |
| Quit-smoking | **Personal** (owner only; partner cannot see it) |
| Goals | Shared |

---

## 4. Storage (incident photos, goal images)

### Buckets
- `incident-photos` — public read **off**, RLS on
- `goal-images` — public read **off**, RLS on
- `meal-photos` (optional) — public read **off**

### Storage RLS
```sql
-- Only whitelisted users can upload
CREATE POLICY "household_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('incident-photos', 'goal-images', 'meal-photos') AND
    auth.uid() IN (SELECT id FROM allowed_users)
  );

-- Only whitelisted users can read (when not using signed URLs)
CREATE POLICY "household_read_storage" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('incident-photos', 'goal-images', 'meal-photos') AND
    auth.uid() IN (SELECT id FROM allowed_users)
  );
```

### Rules
- Photos are served via **signed URLs** (Supabase `createSignedUrl`, 1-hour TTL).
- HEIC is the iPhone default — images are converted to JPEG on the frontend with
  `browser-image-compression` before upload (size + compatibility).

---

## 5. Edge Functions

### Which ones
- `verify-pin` (PIN check) — shipped
- `signup-guard` (is the new user on the whitelist) — shipped
- `pin-reset-email` (forgotten PIN) — planned

### Edge Function rules
- All secrets live in Supabase Secret Manager (`supabase secrets set SERVICE_ROLE_KEY=...`).
- CORS: our domain only (the production URL + `localhost:5173` for dev).
- Rate limit: 10 requests/minute per IP for PIN (simple in-memory in the function).
- Every function has try/catch + structured error logging.

---

## 6. Frontend security

| Risk | Mitigation |
|------|------------|
| XSS | React escapes by default; `dangerouslySetInnerHTML` is **forbidden** |
| Secrets in bundle | Vite `VITE_` prefix exposes only the anon key (protected by Supabase RLS) |
| CSRF | Supabase JWT bearer token, not a cookie |
| Replay | JWT valid 1 hour; refresh token managed by Supabase |
| Password brute force | Supabase Auth default rate limit + PIN as an extra layer |
| Console snooping | `console.log` calls are tree-shaken in production (`vite-plugin-remove-console`) |

### CSP (Content Security Policy)
In `vercel.json` or an `index.html` meta tag:
```
default-src 'self';
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
img-src 'self' data: https://*.supabase.co;
style-src 'self' 'unsafe-inline';
script-src 'self';
```

---

## 7. Audit & monitoring

### Table: `audit_log` (optional but recommended)
```sql
audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,            -- 'login', 'pin_fail', 'pin_success', 'data_delete', etc.
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

Trigger: on critical tables, write to the audit log on DELETE/UPDATE.

---

## 8. Backups

- Supabase daily automatic backup (Pro plan; on Free, a manual `pg_dump` cron).
- Planned: `npm run backup` — schema + data dump → encrypted `.sql.gpg` file.

---

## 9. Pre-commit checklist

Before each change is committed, verify:

- [ ] RLS is enabled on all new tables
- [ ] Each new table has at least 1 SELECT + 1 INSERT policy
- [ ] No sensitive field (PIN hash, password) ever reaches the frontend
- [ ] Any new Edge Function has CORS + a rate limit
- [ ] `.env` is current but gitignored
- [ ] `npm run build` has no secrets in the source map (`grep -r "supabase.co" dist/` shows only the public URL)

---

## 10. Threat model — who are we protecting against?

1. **A random attacker on the internet:** whitelist + RLS is enough.
2. **Stolen phone (someone who knows the PIN):** 5-min PIN-unlock timeout + Face ID toggle (planned).
3. **Stolen phone (someone who doesn't know the PIN):** email + PIN two layers, brute-force lock 15 min.
4. **Seeing the owner's personal data on the partner's phone:** RLS `owner_id = auth.uid()` blocks it (smoking, personal tasks, etc.).
5. **A Supabase administrator:** PIN hash is bcrypt, not in the clear. But anyone with
   physical DB access can see everything — an accepted risk for a small-scale family app.

---

**Code that violates this file does not get merged.**
