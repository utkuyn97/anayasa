/**
 * useDashboard — Fetches summary data for the home dashboard.
 * Each widget gets its own lightweight query to avoid blocking.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  /** Number of pending chore instances assigned to current user today */
  pendingChoreCount: number;
  /** Total completed chore instances this week */
  completedThisWeek: number;
  /** Remaining budget this month (income - fixed - spending) */
  remainingBudget: number | null;
  /** Buffer: current / target */
  buffer: { current: number; target: number } | null;
  /** Number of upcoming calendar events (next 7 days) */
  upcomingEventCount: number;
  /** Today's calorie total eaten vs target */
  calorieToday: { eaten: number; target: number } | null;
  /** Smoking: days smoke-free (null if not set up or not owner) */
  smokingDays: number | null;
  /** Shopping items remaining (not purchased, not archived) */
  shoppingCount: number;
}

const INITIAL: DashboardData = {
  pendingChoreCount: 0,
  completedThisWeek: 0,
  remainingBudget: null,
  buffer: null,
  upcomingEventCount: 0,
  calorieToday: null,
  smokingDays: null,
  shoppingCount: 0,
};

export function useDashboard() {
  const { user, userInfo } = useAuth();
  const [data, setData] = useState<DashboardData>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const weekAhead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    try {
      const results = await Promise.allSettled([
        // 0. Pending chore instances for user
        supabase
          .from('chore_instances')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .eq('status', 'pending')
          .lte('due_at', todayEnd),

        // 1. Completed chore instances this week
        supabase
          .from('chore_instances')
          .select('id', { count: 'exact', head: true })
          .eq('completed_by', user.id)
          .eq('status', 'completed')
          .gte('completed_at', weekAgo),

        // 2. Budget: income sources
        supabase
          .from('income_sources')
          .select('amount_eur, frequency')
          .eq('active', true),

        // 3. Budget: fixed expenses
        supabase
          .from('fixed_expenses')
          .select('amount_eur')
          .eq('active', true),

        // 4. Budget: this month's spending
        supabase
          .from('expenses')
          .select('amount_eur')
          .gte('spent_at', monthStart)
          .lt('spent_at', monthEnd),

        // 5. Buffer
        supabase
          .from('buffer_settings')
          .select('target_amount_eur, current_amount_eur')
          .limit(1)
          .maybeSingle(),

        // 6. Upcoming events (next 7 days)
        supabase
          .from('calendar_events')
          .select('id', { count: 'exact', head: true })
          .gte('start_at', todayStart)
          .lte('start_at', weekAhead),

        // 7. Today's calorie eaten
        supabase
          .from('meal_plans')
          .select('calories, eaten')
          .eq('owner_id', user.id)
          .eq('plan_date', now.toISOString().split('T')[0]),

        // 8. Calorie target
        supabase
          .from('daily_targets')
          .select('target_calories')
          .eq('owner_id', user.id)
          .maybeSingle(),

        // 9. Smoking setup
        supabase
          .from('smoking_quit')
          .select('quit_date')
          .eq('owner_id', user.id)
          .maybeSingle(),

        // 10. Last relapse
        supabase
          .from('smoking_relapse')
          .select('occurred_at')
          .eq('owner_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 11. Shopping count
        supabase
          .from('shopping_items')
          .select('id', { count: 'exact', head: true })
          .eq('purchased', false)
          .is('archived_at', null),
      ]);

      const d: DashboardData = { ...INITIAL };

      // Chores
      if (results[0].status === 'fulfilled') {
        d.pendingChoreCount = results[0].value.count ?? 0;
      }
      if (results[1].status === 'fulfilled') {
        d.completedThisWeek = results[1].value.count ?? 0;
      }

      // Budget
      if (
        results[2].status === 'fulfilled' &&
        results[3].status === 'fulfilled' &&
        results[4].status === 'fulfilled'
      ) {
        const incomes = (results[2].value.data ?? []) as { amount_eur: number; frequency: string }[];
        let totalIncome = 0;
        for (const inc of incomes) {
          const amt = Number(inc.amount_eur);
          if (inc.frequency === 'monthly') totalIncome += amt;
          else if (inc.frequency === 'weekly') totalIncome += amt * 4;
          else totalIncome += amt;
        }
        const totalFixed = ((results[3].value.data ?? []) as { amount_eur: number }[])
          .reduce((s, f) => s + Number(f.amount_eur), 0);
        const totalSpent = ((results[4].value.data ?? []) as { amount_eur: number }[])
          .reduce((s, e) => s + Number(e.amount_eur), 0);
        d.remainingBudget = totalIncome - totalFixed - totalSpent;
      }

      // Buffer
      if (results[5].status === 'fulfilled' && results[5].value.data) {
        const buf = results[5].value.data as { target_amount_eur: number; current_amount_eur: number };
        d.buffer = { current: Number(buf.current_amount_eur), target: Number(buf.target_amount_eur) };
      }

      // Events
      if (results[6].status === 'fulfilled') {
        d.upcomingEventCount = results[6].value.count ?? 0;
      }

      // Calories
      if (results[7].status === 'fulfilled') {
        const meals = (results[7].value.data ?? []) as { calories: number; eaten: boolean }[];
        const eatenCals = meals.filter(m => m.eaten).reduce((s, m) => s + Number(m.calories), 0);
        const targetRow = results[8].status === 'fulfilled' ? results[8].value.data : null;
        if (targetRow) {
          d.calorieToday = { eaten: eatenCals, target: Number((targetRow as { target_calories: number }).target_calories) };
        }
      }

      // Smoking (only for owner)
      if (userInfo?.role === 'owner' && results[9].status === 'fulfilled' && results[9].value.data) {
        const quitDate = new Date((results[9].value.data as { quit_date: string }).quit_date);
        let refDate = quitDate;
        if (results[10].status === 'fulfilled' && results[10].value.data) {
          const relapse = new Date((results[10].value.data as { occurred_at: string }).occurred_at);
          if (relapse > quitDate) refDate = relapse;
        }
        d.smokingDays = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Shopping
      if (results[11].status === 'fulfilled') {
        d.shoppingCount = results[11].value.count ?? 0;
      }

      setData(d);
    } catch {
      // Silently fail — dashboard is best-effort
    } finally {
      setIsLoading(false);
    }
  }, [user, userInfo?.role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, isLoading, refetch: fetchAll };
}
