-- ============================================================================
-- ANAYASA — SEED DATA
-- ============================================================================
-- Run this AFTER schema.sql and rls-policies.sql.
--
-- This file is edited manually:
--   1) Create 2 users manually via Supabase Auth > Users (Add user > Create new user)
--      (signup is disabled, so it can't be done via the API)
--   2) Replace the UUID placeholders below with those users' real auth.users.id values
--   3) Edit the email + display_name + color to match your own
--   4) Run this SQL
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — Allowed Users (whitelist)
-- ----------------------------------------------------------------------------
-- ⚠️ FIRST: Create the 2 users via Supabase Dashboard > Authentication > Users >
--           "Add user". Paste their UUIDs here.

-- Owner (project owner)
insert into allowed_users (id, email, display_name, color_hex, role)
values (
  '00000000-0000-0000-0000-000000000001',  -- ← PUT THE OWNER'S auth.users.id HERE
  'owner@example.com',                      -- ← OWNER email
  'Utku',                                   -- ← OWNER display name
  '#3b82f6',                                -- blue
  'owner'
)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  color_hex = excluded.color_hex,
  role = excluded.role;

-- Partner (spouse)
insert into allowed_users (id, email, display_name, color_hex, role)
values (
  '00000000-0000-0000-0000-000000000002',  -- ← PUT THE PARTNER'S auth.users.id HERE
  'partner@example.com',                    -- ← PARTNER email
  'Partner',                                -- ← PARTNER display name
  '#ec4899',                                -- pink
  'partner'
)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  color_hex = excluded.color_hex,
  role = excluded.role;


-- ----------------------------------------------------------------------------
-- STEP 2 — User Settings (default values)
-- ----------------------------------------------------------------------------
insert into user_settings (user_id, language, theme)
values
  ('00000000-0000-0000-0000-000000000001', 'tr', 'system'),
  ('00000000-0000-0000-0000-000000000002', 'tr', 'system')
on conflict (user_id) do nothing;


-- ----------------------------------------------------------------------------
-- STEP 3 — Buffer Settings (single row, household buffer target)
-- ----------------------------------------------------------------------------
-- Used in Sprint 4. Create 1 row now so the UI doesn't crash on first open.
insert into buffer_settings (target_amount_eur, current_amount_eur)
select 5000, 0
where not exists (select 1 from buffer_settings);


-- ----------------------------------------------------------------------------
-- STEP 4 — (Optional) Default expense categories (useful in Sprint 4)
-- ----------------------------------------------------------------------------
-- Uncomment when you reach Sprint 4:

-- insert into expense_categories (name, monthly_limit_eur, scope, color_hex, icon)
-- values
--   ('Grocery',       700, 'shared', '#10b981', 'shopping-cart'),
--   ('Fuel',          200, 'shared', '#f59e0b', 'fuel'),
--   ('Entertainment', 150, 'shared', '#8b5cf6', 'sparkles'),
--   ('Health',        100, 'shared', '#ef4444', 'heart-pulse')
-- on conflict do nothing;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- select * from allowed_users;            -- should show 2 rows
-- select * from user_settings;            -- 2 rows
-- select * from buffer_settings;          -- 1 row
