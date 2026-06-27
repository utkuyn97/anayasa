/**
 * HomePage — Enriched dashboard with real data widgets (Sprint 6).
 * Shows: greeting, today's tasks, budget summary, buffer, smoking counter,
 * upcoming events, calorie summary, shopping count, module quick-access.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ShoppingCart,
  Wallet,
  UtensilsCrossed,
  Calendar,
  Package,
  AlertCircle,
  Scale,
  Cigarette,
  Star,
  ShieldCheck,
  Flame,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

export default function HomePage() {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold">
          {t('home.greeting', { name: userInfo?.display_name ?? '' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('home.summary')}
        </p>
      </div>

      {/* ─── Top Widgets ─── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tasks today */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
          onClick={() => navigate('/tasks/me')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                <CheckSquare className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {t('home.todayTasks')}
              </span>
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-10 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">
                  {data.pendingChoreCount}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t('home.completedWeek', { count: data.completedThisWeek })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
          onClick={() => navigate('/finance')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 dark:bg-green-500/20">
                <Wallet className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {t('home.budget')}
              </span>
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-20 animate-pulse rounded bg-muted" />
              ) : data.remainingBudget !== null ? (
                <p className={`text-xl font-bold tabular-nums ${data.remainingBudget < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(data.remainingBudget)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('home.noData')}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t('home.thisMonth')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Buffer */}
        {data.buffer && (
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
            onClick={() => navigate('/finance')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('finance.bufferLabel')}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(data.buffer.current)}
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, data.buffer.target > 0 ? (data.buffer.current / data.buffer.target) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smoking counter (owner only) */}
        {data.smokingDays !== null && (
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
            onClick={() => navigate('/smoking')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                  <Cigarette className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('smoking.smokeFree')}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {data.smokingDays}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('smoking.unit.days')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar upcoming */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
          onClick={() => navigate('/calendar')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 dark:bg-pink-500/20">
                <Calendar className="h-4 w-4 text-pink-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {t('home.upcomingEvents')}
              </span>
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-8 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">
                  {data.upcomingEventCount}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t('home.next7Days')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calories today */}
        {data.calorieToday && (
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
            onClick={() => navigate('/calories')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('calories.macro.calories')}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold tabular-nums">
                  {data.calorieToday.eaten}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{data.calorieToday.target}
                  </span>
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{
                      width: `${Math.min(100, data.calorieToday.target > 0 ? (data.calorieToday.eaten / data.calorieToday.target) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shopping */}
        {data.shoppingCount > 0 && (
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98]"
            onClick={() => navigate('/shopping')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                  <ShoppingCart className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {t('home.shoppingRemaining')}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold tabular-nums">
                  {data.shoppingCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('home.itemsToBuy')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Quick Access Grid ─── */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {t('home.quickAccess')}
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {quickAccessItems.map(({ icon: Icon, labelKey, route, color, bg }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition-colors active:bg-muted/50"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-[10px] font-medium leading-tight text-center text-muted-foreground">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty state when no pending tasks */}
      {!isLoading && data.pendingChoreCount === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('home.noPendingTasks')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Quick access grid items (all 10 modules + settings)
const quickAccessItems = [
  { icon: CheckSquare, labelKey: 'modules.chores', color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20', route: '/tasks' },
  { icon: Package, labelKey: 'modules.inventory', color: 'text-teal-500', bg: 'bg-teal-500/10 dark:bg-teal-500/20', route: '/inventory' },
  { icon: ShoppingCart, labelKey: 'modules.shopping', color: 'text-purple-500', bg: 'bg-purple-500/10 dark:bg-purple-500/20', route: '/shopping' },
  { icon: AlertCircle, labelKey: 'modules.incidents', color: 'text-red-500', bg: 'bg-red-500/10 dark:bg-red-500/20', route: '/incidents' },
  { icon: Wallet, labelKey: 'modules.finance', color: 'text-green-500', bg: 'bg-green-500/10 dark:bg-green-500/20', route: '/finance' },
  { icon: UtensilsCrossed, labelKey: 'modules.caloriesModule', color: 'text-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/20', route: '/calories' },
  { icon: Calendar, labelKey: 'modules.calendarModule', color: 'text-pink-500', bg: 'bg-pink-500/10 dark:bg-pink-500/20', route: '/calendar' },
  { icon: Scale, labelKey: 'modules.body', color: 'text-indigo-500', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', route: '/body' },
  { icon: Cigarette, labelKey: 'modules.smoking', color: 'text-amber-500', bg: 'bg-amber-500/10 dark:bg-amber-500/20', route: '/smoking' },
  { icon: Star, labelKey: 'modules.goals', color: 'text-yellow-500', bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', route: '/goals' },
] as const;
