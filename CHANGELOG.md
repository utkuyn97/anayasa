# Changelog

## v1.0.0 — 2026-05-13

### First release 🎉

Anayasa v1.0.0 ships with all modules complete.

### Modules

- **Tasks**: household chores (recurring + one-off) and personal tasks, with lazy
  materialization for generating instances.
- **Inventory**: category-based stock tracking, low-stock alerts, one-tap add to the
  shopping list.
- **Shopping list**: realtime-synced grocery list, archiving, frequently-added items.
- **Incidents**: photo-based incident log, severity levels, resolution tracking.
- **Finance**: income/expense management, category spending limits, buffer tracking,
  monthly summary.
- **Calories & macros**: daily nutrition plan, macro tracking, goal setting.
- **Calendar**: monthly view, shared/personal events, realtime sync.
- **Weight & body**: weight and body measurements, trend charts, personal.
- **Quit-smoking**: smoke-free day counter, savings calculation, milestones, relapse tracking.
- **Goals**: image-backed goal cards, milestones, confetti animation.

### Infrastructure

- Supabase Auth + 6-digit PIN (bcrypt hash, Edge Function)
- Row-Level Security: active on 15+ tables, `is_household_member()` + scope-based policies
- PWA: iOS Safari compatible, offline cache, service worker
- i18n: full TR/EN support
- Realtime: Supabase WebSocket (chores, inventory, shopping, calendar, goals, finance)

### Polish

- Dark mode: light / dark / system toggle
- Rich dashboard: widgets for task counts, budget, buffer, smoking, calendar, calories, shopping
- Code splitting: per-module lazy loading via `React.lazy()`
- ErrorBoundary: global + module-level error capture
- CSP headers: enabled via `vercel.json`
- Audit triggers: chores DELETE + expenses DELETE are logged
- PWA manifest: shortcuts, categories, dark theme-color

### Known limitations

- No calendar week view (out of scope)
- No PIN-reset Edge Function yet (manual reset via Supabase Dashboard)
- No pg_cron (free plan; lazy materialization is sufficient)
- No iCal sync (out of scope)
