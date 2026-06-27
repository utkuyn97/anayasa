-- ============================================================================
-- ANAYASA — DATABASE SCHEMA
-- ============================================================================
-- Run sprint by sprint. First paste your sprint's section into the Supabase SQL
-- Editor + Run. RLS policies live in a separate file (rls-policies.sql).
--
-- RULE: After every CREATE TABLE, ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- (written explicitly since it is not enabled by DEFAULT).
-- ============================================================================


-- ============================================================================
-- SPRINT 1 — Foundation
-- ============================================================================

-- 1.1 — Whitelisted users
create table if not exists allowed_users (
  id           uuid primary key,                      -- same as auth.users.id (manual sync)
  email        text unique not null,
  display_name text not null,
  color_hex    text default '#3b82f6',                -- avatar/UI color
  role         text not null check (role in ('owner', 'partner')),
  created_at   timestamptz default now()
);
alter table allowed_users enable row level security;

-- 1.2 — User PIN
create table if not exists user_pins (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  pin_hash               text not null,
  failed_attempts        int  default 0,
  locked_until           timestamptz,
  remember_device_until  timestamptz,
  device_fingerprint     text,
  updated_at             timestamptz default now()
);
alter table user_pins enable row level security;

-- 1.3 — User settings (preferences)
create table if not exists user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  language   text default 'tr' check (language in ('tr', 'en')),
  theme      text default 'system' check (theme in ('light', 'dark', 'system')),
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;

-- 1.4 — Audit log (trigger added in Sprint 6, create the table now)
create table if not exists audit_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id),
  action     text not null,
  metadata   jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);
alter table audit_log enable row level security;
create index if not exists audit_log_user_idx on audit_log(user_id, created_at desc);


-- ============================================================================
-- SPRINT 2 — Task System (Chores + Personal Tasks)
-- ============================================================================

-- 2.1 — Chores (recurring or one-off task definitions)
create table if not exists chores (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  frequency_type  text not null check (frequency_type in
                    ('once','hourly','daily','weekly','monthly','custom_days')),
  frequency_value int default 1,                     -- "every N units"
  deadline_hours  int default 24,                    -- deadline from creation time
  assigned_to     uuid references auth.users(id),    -- nullable = unassigned
  created_by      uuid not null references auth.users(id),
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table chores enable row level security;
create index if not exists chores_active_idx on chores(active);

-- 2.2 — Chore instances (a single task generated on each trigger)
create table if not exists chore_instances (
  id            uuid primary key default gen_random_uuid(),
  chore_id      uuid not null references chores(id) on delete cascade,
  due_at        timestamptz not null,
  assigned_to   uuid references auth.users(id),     -- snapshot
  status        text default 'pending' check (status in
                  ('pending','completed','skipped','overdue')),
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id),
  skip_note     text,
  created_at    timestamptz default now()
);
alter table chore_instances enable row level security;
create index if not exists chore_instances_due_idx on chore_instances(due_at);
create index if not exists chore_instances_chore_idx on chore_instances(chore_id);
create index if not exists chore_instances_status_idx on chore_instances(status);

-- 2.3 — Personal tasks (visible to owner only)
create table if not exists personal_tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  due_at       timestamptz,
  priority     text default 'med' check (priority in ('low','med','high')),
  tags         text[],
  completed_at timestamptz,
  recurrence   text check (recurrence in ('daily','weekly','monthly')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table personal_tasks enable row level security;
create index if not exists personal_tasks_owner_idx on personal_tasks(owner_id, due_at);


-- ============================================================================
-- SPRINT 3 — Household Operations (Inventory + Shopping + Incidents)
-- ============================================================================

-- 3.1 — Inventory items
create table if not exists inventory_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  quantity       numeric default 0,
  unit           text default 'adet',
  category       text default 'genel',
  low_threshold  numeric,                            -- warn when it drops below this
  note           text,
  updated_at     timestamptz default now(),
  updated_by     uuid references auth.users(id),
  created_at     timestamptz default now()
);
alter table inventory_items enable row level security;
create index if not exists inventory_category_idx on inventory_items(category);

-- 3.2 — Shopping items
create table if not exists shopping_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  quantity       numeric default 1,
  unit           text default 'adet',
  category       text default 'genel',
  note           text,
  added_by       uuid not null references auth.users(id),
  added_at       timestamptz default now(),
  purchased      boolean default false,
  purchased_at   timestamptz,
  purchased_by   uuid references auth.users(id),
  archived_at    timestamptz                         -- set if archived
);
alter table shopping_items enable row level security;
create index if not exists shopping_active_idx on shopping_items(purchased, added_at desc)
  where archived_at is null;

-- 3.3 — Incidents
create table if not exists incidents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text default 'genel' check (category in
                ('mutfak','banyo','salon','yatak','genel','diger')),
  severity    text default 'info' check (severity in ('info','warn','crit')),
  photo_path  text,                                  -- Supabase Storage path
  reported_by uuid not null references auth.users(id),
  reported_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
alter table incidents enable row level security;
create index if not exists incidents_active_idx on incidents(resolved_at, reported_at desc);


-- ============================================================================
-- SPRINT 4 — Money & Nutrition (Finance + Calories)
-- ============================================================================

-- 4.1 — Income sources
create table if not exists income_sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  amount_eur  numeric not null,
  frequency   text default 'monthly' check (frequency in ('monthly','weekly','onetime')),
  scope       text default 'shared' check (scope in ('shared','personal')),
  owner_id    uuid references auth.users(id),       -- set if personal
  active      boolean default true,
  created_at  timestamptz default now()
);
alter table income_sources enable row level security;

-- 4.2 — Fixed monthly expenses
create table if not exists fixed_expenses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  amount_eur    numeric not null,
  day_of_month  int default 1 check (day_of_month between 1 and 31),
  category      text default 'genel',
  scope         text default 'shared' check (scope in ('shared','personal')),
  owner_id      uuid references auth.users(id),
  active        boolean default true,
  created_at    timestamptz default now()
);
alter table fixed_expenses enable row level security;

-- 4.3 — Dynamic expense categories (limit + scope)
create table if not exists expense_categories (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  monthly_limit_eur  numeric default 0,
  scope              text not null check (scope in ('shared','personal')),
  owner_id           uuid references auth.users(id),
  color_hex          text default '#3b82f6',
  icon               text default 'circle',          -- lucide icon name
  active             boolean default true,
  created_at         timestamptz default now()
);
alter table expense_categories enable row level security;
create index if not exists expense_categories_scope_idx on expense_categories(scope, owner_id);

-- 4.4 — Expenses (dynamic spending)
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references expense_categories(id) on delete restrict,
  amount_eur   numeric not null check (amount_eur > 0),
  note         text,
  spent_at     timestamptz default now(),
  spent_by     uuid not null references auth.users(id),
  created_at   timestamptz default now()
);
alter table expenses enable row level security;
create index if not exists expenses_category_date_idx on expenses(category_id, spent_at);

-- 4.5 — Buffer (household liquidity buffer)
create table if not exists buffer_settings (
  id                 uuid primary key default gen_random_uuid(),
  target_amount_eur  numeric not null default 0,
  current_amount_eur numeric not null default 0,
  last_updated_at    timestamptz default now(),
  updated_by         uuid references auth.users(id)
);
alter table buffer_settings enable row level security;
-- There will be only a single row; instead of a pre-insert check trigger, create 1 row via seed.

-- 4.6 — Daily calorie/macro targets (one row per person)
create table if not exists daily_targets (
  owner_id         uuid primary key references auth.users(id) on delete cascade,
  target_calories  int default 2000,
  target_protein_g int default 150,
  target_carbs_g   int default 200,
  target_fat_g     int default 70,
  updated_at       timestamptz default now()
);
alter table daily_targets enable row level security;

-- 4.7 — Meal plans (day by day, meal by meal)
create table if not exists meal_plans (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  plan_date   date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name   text not null,
  amount_g    numeric,
  calories    int default 0,
  protein_g   numeric default 0,
  carbs_g     numeric default 0,
  fat_g       numeric default 0,
  eaten       boolean default false,
  eaten_at    timestamptz,
  planned_at  timestamptz default now()
);
alter table meal_plans enable row level security;
create index if not exists meal_plans_owner_date_idx on meal_plans(owner_id, plan_date);


-- ============================================================================
-- SPRINT 5 — Personal & Shared (Calendar + Body + Smoking + Goals)
-- ============================================================================

-- 5.1 — Calendar events
create table if not exists calendar_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  start_at     timestamptz not null,
  end_at       timestamptz,
  all_day      boolean default false,
  location     text,
  scope        text default 'shared' check (scope in ('shared','personal')),
  owner_id     uuid references auth.users(id),       -- set if personal
  color_hex    text default '#3b82f6',
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz default now()
);
alter table calendar_events enable row level security;
create index if not exists calendar_start_idx on calendar_events(start_at);

-- 5.2 — Body measurements
create table if not exists body_measurements (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  measured_at    date not null default current_date,
  weight_kg      numeric not null,
  body_fat_pct   numeric,
  waist_cm       numeric,
  chest_cm       numeric,
  arm_cm         numeric,
  hip_cm         numeric,
  note           text,
  created_at     timestamptz default now()
);
alter table body_measurements enable row level security;
create index if not exists body_owner_date_idx on body_measurements(owner_id, measured_at desc);

-- 5.3 — Smoking quit setup (one row per person)
create table if not exists smoking_quit (
  owner_id                  uuid primary key references auth.users(id) on delete cascade,
  quit_date                 timestamptz not null,
  cigarettes_per_day_before int not null,
  price_per_pack_eur        numeric not null,
  cigarettes_per_pack       int not null default 20,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);
alter table smoking_quit enable row level security;

-- 5.4 — Smoking relapses
create table if not exists smoking_relapse (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  count        int default 1,
  note         text,
  created_at   timestamptz default now()
);
alter table smoking_relapse enable row level security;
create index if not exists smoking_relapse_owner_idx on smoking_relapse(owner_id, occurred_at desc);

-- 5.5 — Smoking milestones
create table if not exists smoking_milestones (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  milestone_key   text not null check (milestone_key in
                    ('24h','72h','7d','30d','90d','180d','365d')),
  achieved_at     timestamptz default now(),
  unique (owner_id, milestone_key)
);
alter table smoking_milestones enable row level security;

-- 5.6 — Goals (dreams & objectives)
create table if not exists goals (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  image_path   text,                                  -- Supabase Storage
  status       text default 'dreaming' check (status in
                 ('dreaming','planned','in_progress','achieved','paused')),
  category     text default 'genel',
  scope        text default 'shared' check (scope in ('shared','personal')),
  owner_id     uuid references auth.users(id),
  target_date  date,
  achieved_at  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table goals enable row level security;
create index if not exists goals_status_idx on goals(status);

-- 5.7 — Goal milestones
create table if not exists goal_milestones (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references goals(id) on delete cascade,
  title         text not null,
  completed_at  timestamptz,
  ordering      int default 0,
  created_at    timestamptz default now()
);
alter table goal_milestones enable row level security;
create index if not exists goal_milestones_goal_idx on goal_milestones(goal_id, ordering);


-- ============================================================================
-- SPRINT 6 — Polish (Cron, Audit Triggers)
-- ============================================================================

-- 6.1 — pg_cron extension (Supabase Dashboard > Database > Extensions > Enable pg_cron)
-- After installation:
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'materialize-chore-instances',
--   '0 3 * * *',
--   $$
--   -- Generate chore_instances rows for recurring chores over the next 30 days
--   -- (helper function to be added, plpgsql)
--   select 1;
--   $$
-- );

-- 6.2 — Audit trigger example
-- create or replace function audit_critical_change() returns trigger as $$
-- begin
--   insert into audit_log(user_id, action, metadata)
--   values (auth.uid(), TG_OP || '_' || TG_TABLE_NAME,
--           jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
--   return coalesce(NEW, OLD);
-- end;
-- $$ language plpgsql security definer;
-- 
-- create trigger audit_buffer_change
--   after update or delete on buffer_settings
--   for each row execute function audit_critical_change();


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Trigger function to auto-update updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers to the tables that need them:
create trigger touch_chores_updated      before update on chores
  for each row execute function set_updated_at();
create trigger touch_personal_tasks_upd  before update on personal_tasks
  for each row execute function set_updated_at();
create trigger touch_inventory_upd       before update on inventory_items
  for each row execute function set_updated_at();
create trigger touch_user_settings_upd   before update on user_settings
  for each row execute function set_updated_at();
create trigger touch_user_pins_upd       before update on user_pins
  for each row execute function set_updated_at();
create trigger touch_smoking_quit_upd    before update on smoking_quit
  for each row execute function set_updated_at();
create trigger touch_daily_targets_upd   before update on daily_targets
  for each row execute function set_updated_at();
create trigger touch_goals_upd           before update on goals
  for each row execute function set_updated_at();


-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- After running this file: run rls-policies.sql.
-- Then: run seed.sql.
