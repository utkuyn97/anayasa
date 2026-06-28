-- ============================================================================
-- ANAYASA — ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Run AFTER schema.sql. Sprint by sprint, each its own section.
--
-- Two core patterns:
--   1) household: if you're in the allowed_users table, read/write (shared data)
--   2) personal:  additionally owner_id = auth.uid() (personal data)
-- ============================================================================


-- ============================================================================
-- SHARED HELPER: checks whether a user is on the whitelist
-- (used repeatedly across RLS expressions; the function is not a table trigger,
--  just a readable check)
-- ============================================================================
create or replace function is_household_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_users where id = auth.uid()
  );
$$;

revoke all on function is_household_member() from public;
grant execute on function is_household_member() to authenticated;


-- ============================================================================
-- SPRINT 1 — Foundation
-- ============================================================================

-- 1.1 — allowed_users
-- Every authenticated user (since they're on the whitelist) can read their own
-- row and their partner's row. Update/insert/delete for owner handled by an Edge
-- function in Sprint 6.
drop policy if exists "allowed_users_read" on allowed_users;
create policy "allowed_users_read"
  on allowed_users for select
  to authenticated
  using ( is_household_member() );

-- 1.2 — user_pins
-- Hardened: ALL PIN writes go through the verify-pin Edge Function (service_role,
-- which bypasses RLS). The frontend gets NO insert/update/delete — this prevents a
-- client from resetting its own failed_attempts / locked_until to defeat the lockout.
-- The frontend may only READ its own row, and column grants hide the bcrypt pin_hash.
drop policy if exists "user_pins_insert_own" on user_pins;
drop policy if exists "user_pins_update_own" on user_pins;

drop policy if exists "user_pins_select_own" on user_pins;
create policy "user_pins_select_own"
  on user_pins for select
  to authenticated
  using ( user_id = auth.uid() );

-- Column-level grant: the client may read everything EXCEPT the pin_hash.
revoke select on user_pins from authenticated;
grant select (user_id, failed_attempts, locked_until, remember_device_until, device_fingerprint, updated_at)
  on user_pins to authenticated;

-- 1.3 — user_settings (per-user settings)
drop policy if exists "user_settings_own" on user_settings;
create policy "user_settings_own"
  on user_settings for all
  to authenticated
  using ( user_id = auth.uid() and is_household_member() )
  with check ( user_id = auth.uid() and is_household_member() );

-- 1.4 — audit_log
-- Read: a household member can only read their own logs
drop policy if exists "audit_log_read_own" on audit_log;
create policy "audit_log_read_own"
  on audit_log for select
  to authenticated
  using ( user_id = auth.uid() );

-- Insert: done by triggers (security definer fn); the frontend cannot.
drop policy if exists "audit_log_no_insert" on audit_log;
create policy "audit_log_no_insert"
  on audit_log for insert
  to authenticated
  with check ( false );


-- ============================================================================
-- SPRINT 2 — Task System
-- ============================================================================

-- 2.1 — chores (shared)
drop policy if exists "chores_household" on chores;
create policy "chores_household"
  on chores for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );

-- 2.2 — chore_instances (shared)
drop policy if exists "chore_instances_household" on chore_instances;
create policy "chore_instances_household"
  on chore_instances for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );

-- 2.3 — personal_tasks (personal)
drop policy if exists "personal_tasks_owner" on personal_tasks;
create policy "personal_tasks_owner"
  on personal_tasks for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );


-- ============================================================================
-- SPRINT 3 — Household Operations
-- ============================================================================

-- 3.1 — inventory_items
drop policy if exists "inventory_household" on inventory_items;
create policy "inventory_household"
  on inventory_items for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );

-- 3.2 — shopping_items
drop policy if exists "shopping_household" on shopping_items;
create policy "shopping_household"
  on shopping_items for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );

-- 3.3 — incidents
drop policy if exists "incidents_household" on incidents;
create policy "incidents_household"
  on incidents for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );


-- 3.4 — Storage RLS
-- Can be done from Supabase Dashboard > Storage > Policies, or via SQL:
-- (the storage.objects table is managed by Supabase; RLS is on by default.)

-- incident-photos bucket
drop policy if exists "incident_photos_select" on storage.objects;
create policy "incident_photos_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'incident-photos'
    and is_household_member()
  );

drop policy if exists "incident_photos_insert" on storage.objects;
create policy "incident_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'incident-photos'
    and is_household_member()
  );

drop policy if exists "incident_photos_delete" on storage.objects;
create policy "incident_photos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'incident-photos'
    and is_household_member()
  );

-- goal-images bucket (used in Sprint 5; we're enabling it now)
drop policy if exists "goal_images_select" on storage.objects;
create policy "goal_images_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'goal-images'
    and is_household_member()
  );

drop policy if exists "goal_images_insert" on storage.objects;
create policy "goal_images_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'goal-images'
    and is_household_member()
  );

drop policy if exists "goal_images_delete" on storage.objects;
create policy "goal_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'goal-images'
    and is_household_member()
  );


-- ============================================================================
-- SPRINT 4 — Money & Nutrition
-- ============================================================================

-- 4.1 — income_sources
-- shared scope is visible to everyone; personal scope is visible only to the owner.
drop policy if exists "income_select" on income_sources;
create policy "income_select"
  on income_sources for select
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

drop policy if exists "income_modify_shared" on income_sources;
create policy "income_modify_shared"
  on income_sources for all
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  )
  with check (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

-- 4.2 — fixed_expenses
drop policy if exists "fixed_select" on fixed_expenses;
create policy "fixed_select"
  on fixed_expenses for select
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

drop policy if exists "fixed_modify" on fixed_expenses;
create policy "fixed_modify"
  on fixed_expenses for all
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  )
  with check (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

-- 4.3 — expense_categories
drop policy if exists "categories_select" on expense_categories;
create policy "categories_select"
  on expense_categories for select
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

drop policy if exists "categories_modify" on expense_categories;
create policy "categories_modify"
  on expense_categories for all
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  )
  with check (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

-- 4.4 — expenses
-- the scope of expenses comes via the category → check with a join.
drop policy if exists "expenses_select" on expenses;
create policy "expenses_select"
  on expenses for select
  to authenticated
  using (
    is_household_member()
    and exists (
      select 1 from expense_categories c
      where c.id = expenses.category_id
        and ( c.scope = 'shared' or c.owner_id = auth.uid() )
    )
  );

drop policy if exists "expenses_insert" on expenses;
create policy "expenses_insert"
  on expenses for insert
  to authenticated
  with check (
    is_household_member()
    and spent_by = auth.uid()
    and exists (
      select 1 from expense_categories c
      where c.id = expenses.category_id
        and ( c.scope = 'shared' or c.owner_id = auth.uid() )
    )
  );

drop policy if exists "expenses_update_own" on expenses;
create policy "expenses_update_own"
  on expenses for update
  to authenticated
  using (
    is_household_member()
    and spent_by = auth.uid()
  )
  with check (
    is_household_member()
    and spent_by = auth.uid()
  );

drop policy if exists "expenses_delete_own" on expenses;
create policy "expenses_delete_own"
  on expenses for delete
  to authenticated
  using (
    is_household_member()
    and spent_by = auth.uid()
  );

-- 4.5 — buffer_settings (shared)
drop policy if exists "buffer_household" on buffer_settings;
create policy "buffer_household"
  on buffer_settings for all
  to authenticated
  using ( is_household_member() )
  with check ( is_household_member() );

-- 4.6 — daily_targets (personal)
drop policy if exists "daily_targets_owner" on daily_targets;
create policy "daily_targets_owner"
  on daily_targets for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );

-- 4.7 — meal_plans (personal)
drop policy if exists "meal_plans_owner" on meal_plans;
create policy "meal_plans_owner"
  on meal_plans for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );


-- ============================================================================
-- SPRINT 5 — Personal & Joint
-- ============================================================================

-- 5.1 — calendar_events
drop policy if exists "calendar_select" on calendar_events;
create policy "calendar_select"
  on calendar_events for select
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

drop policy if exists "calendar_modify" on calendar_events;
create policy "calendar_modify"
  on calendar_events for all
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  )
  with check (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

-- 5.2 — body_measurements (personal)
drop policy if exists "body_owner" on body_measurements;
create policy "body_owner"
  on body_measurements for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );

-- 5.3 — smoking_quit (personal)
drop policy if exists "smoking_quit_owner" on smoking_quit;
create policy "smoking_quit_owner"
  on smoking_quit for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );

-- 5.4 — smoking_relapse (personal)
drop policy if exists "smoking_relapse_owner" on smoking_relapse;
create policy "smoking_relapse_owner"
  on smoking_relapse for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );

-- 5.5 — smoking_milestones (personal)
drop policy if exists "smoking_milestones_owner" on smoking_milestones;
create policy "smoking_milestones_owner"
  on smoking_milestones for all
  to authenticated
  using ( owner_id = auth.uid() and is_household_member() )
  with check ( owner_id = auth.uid() and is_household_member() );

-- 5.6 — goals (hybrid: shared or personal scope flag)
drop policy if exists "goals_select" on goals;
create policy "goals_select"
  on goals for select
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

drop policy if exists "goals_modify" on goals;
create policy "goals_modify"
  on goals for all
  to authenticated
  using (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  )
  with check (
    is_household_member()
    and ( scope = 'shared' or owner_id = auth.uid() )
  );

-- 5.7 — goal_milestones (follows the parent goal's scope)
drop policy if exists "goal_milestones_select" on goal_milestones;
create policy "goal_milestones_select"
  on goal_milestones for select
  to authenticated
  using (
    is_household_member()
    and exists (
      select 1 from goals g
      where g.id = goal_milestones.goal_id
        and ( g.scope = 'shared' or g.owner_id = auth.uid() )
    )
  );

drop policy if exists "goal_milestones_modify" on goal_milestones;
create policy "goal_milestones_modify"
  on goal_milestones for all
  to authenticated
  using (
    is_household_member()
    and exists (
      select 1 from goals g
      where g.id = goal_milestones.goal_id
        and ( g.scope = 'shared' or g.owner_id = auth.uid() )
    )
  )
  with check (
    is_household_member()
    and exists (
      select 1 from goals g
      where g.id = goal_milestones.goal_id
        and ( g.scope = 'shared' or g.owner_id = auth.uid() )
    )
  );


-- ============================================================================
-- END
-- ============================================================================
-- Test queries (pgAdmin or SQL Editor):
--   set local role authenticated;
--   set local "request.jwt.claims" = '{"sub":"<owner-uuid>"}';
--   select * from personal_tasks;  -- only the owner's tasks
--
-- In production, Supabase sets the JWT automatically.
