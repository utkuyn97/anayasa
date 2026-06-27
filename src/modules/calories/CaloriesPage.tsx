/**
 * CaloriesPage.tsx — Calories & Macro tracking module.
 *
 * 2 tabs: "Today" (eaten checklist + progress rings) | "Plan Tomorrow"
 * Features: mark eaten, daily target progress, copy previous day.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, subDays } from 'date-fns';
import {
  Plus,
  Settings,
  Check,
  Copy,
  Loader2,
  UtensilsCrossed,
  Trash2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/components/ui/toast';

import type { DailyTarget, MealPlan, MealType, DailyTotals } from './calories.types';
import {
  getDailyTarget,
  listMealPlans,
  markEaten,
  unmarkEaten,
  deleteMealPlan,
  copyDayPlan,
} from './calories.api';

import MealPlanFormSheet from './MealPlanFormSheet';
import CaloriesTargetSheet from './CaloriesTargetSheet';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function computeTotals(meals: MealPlan[]): DailyTotals {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let eatenCalories = 0;
  let eatenProtein = 0;
  let eatenCarbs = 0;
  let eatenFat = 0;

  for (const m of meals) {
    totalCalories += m.calories;
    totalProtein += Number(m.protein_g);
    totalCarbs += Number(m.carbs_g);
    totalFat += Number(m.fat_g);
    if (m.eaten) {
      eatenCalories += m.calories;
      eatenProtein += Number(m.protein_g);
      eatenCarbs += Number(m.carbs_g);
      eatenFat += Number(m.fat_g);
    }
  }

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    eatenCalories,
    eatenProtein,
    eatenCarbs,
    eatenFat,
  };
}

/** Simple circular progress ring */
function ProgressRing({
  value,
  max,
  label,
  unit,
  color,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            className="text-muted"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {Math.round(pct)}%
        </span>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">
        {Math.round(value)}/{max}{unit}
      </span>
    </div>
  );
}

export default function CaloriesPage() {
  const { t } = useTranslation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
  const [target, setTarget] = useState<DailyTarget | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealPlan[]>([]);
  const [tomorrowMeals, setTomorrowMeals] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const [formDate, setFormDate] = useState(today);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tgt, todayM, tomorrowM] = await Promise.all([
        getDailyTarget(),
        listMealPlans(today),
        listMealPlans(tomorrow),
      ]);
      setTarget(tgt);
      setTodayMeals(todayM);
      setTomorrowMeals(tomorrowM);
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [today, tomorrow, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayTotals = useMemo(() => computeTotals(todayMeals), [todayMeals]);
  const tomorrowTotals = useMemo(() => computeTotals(tomorrowMeals), [tomorrowMeals]);

  const currentMeals = tab === 'today' ? todayMeals : tomorrowMeals;
  const currentTotals = tab === 'today' ? todayTotals : tomorrowTotals;

  // Group meals by type
  const groupedMeals = useMemo(() => {
    const map = new Map<MealType, MealPlan[]>();
    MEAL_ORDER.forEach((mt) => map.set(mt, []));
    currentMeals.forEach((m) => {
      const list = map.get(m.meal_type) ?? [];
      list.push(m);
      map.set(m.meal_type, list);
    });
    return map;
  }, [currentMeals]);

  async function handleToggleEaten(meal: MealPlan) {
    try {
      if (meal.eaten) {
        await unmarkEaten(meal.id);
      } else {
        await markEaten(meal.id);
      }
      await fetchData();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMealPlan(id);
      toast({ title: t('calories.toast.deleted') });
      await fetchData();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  }

  async function handleCopyYesterday() {
    try {
      await copyDayPlan(yesterday, tomorrow);
      toast({ title: t('calories.toast.copied') });
      await fetchData();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  }

  function openAddForm() {
    setFormDate(tab === 'today' ? today : tomorrow);
    setFormSheetOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('calories.title')}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTargetSheetOpen(true)}
          id="calories-target-btn"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted p-1">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'today'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          {t('calories.tab.today')}
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'tomorrow'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          {t('calories.tab.tomorrow')}
        </button>
      </div>

      {/* Progress Rings */}
      {target && (
        <Card>
          <CardContent className="flex items-center justify-around py-4">
            <ProgressRing
              value={currentTotals.eatenCalories}
              max={target.target_calories}
              label={t('calories.macro.calories')}
              unit="kcal"
              color="#3b82f6"
            />
            <ProgressRing
              value={currentTotals.eatenProtein}
              max={target.target_protein_g}
              label={t('calories.macro.protein')}
              unit="g"
              color="#ef4444"
            />
            <ProgressRing
              value={currentTotals.eatenCarbs}
              max={target.target_carbs_g}
              label={t('calories.macro.carbs')}
              unit="g"
              color="#f59e0b"
            />
            <ProgressRing
              value={currentTotals.eatenFat}
              max={target.target_fat_g}
              label={t('calories.macro.fat')}
              unit="g"
              color="#22c55e"
            />
          </CardContent>
        </Card>
      )}

      {!target && (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('calories.noTarget')}
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setTargetSheetOpen(true)}
          >
            {t('calories.setTarget')}
          </Button>
        </Card>
      )}

      {/* Copy Yesterday (only on tomorrow tab) */}
      {tab === 'tomorrow' && tomorrowMeals.length === 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleCopyYesterday}
        >
          <Copy className="mr-2 h-4 w-4" />
          {t('calories.copyYesterday')}
        </Button>
      )}

      {/* Meal Groups */}
      {currentMeals.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8 text-muted-foreground" />}
          title={t('calories.empty.title')}
          description={t('calories.empty.description')}
        />
      ) : (
        MEAL_ORDER.map((mealType) => {
          const meals = groupedMeals.get(mealType) ?? [];
          if (meals.length === 0) return null;
          return (
            <div key={mealType}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {t(`calories.mealType.${mealType}`)}
              </h3>
              <div className="space-y-2">
                {meals.map((meal) => (
                  <Card
                    key={meal.id}
                    className={`p-3 transition-opacity ${
                      meal.eaten ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Eaten toggle (only for today) */}
                      {tab === 'today' && (
                        <button
                          onClick={() => handleToggleEaten(meal)}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            meal.eaten
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {meal.eaten && <Check className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            meal.eaten ? 'line-through' : ''
                          }`}
                        >
                          {meal.food_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meal.calories}kcal · P{Math.round(Number(meal.protein_g))}g · C{Math.round(Number(meal.carbs_g))}g · F{Math.round(Number(meal.fat_g))}g
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleDelete(meal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* FAB — Add Meal */}
      <button
        onClick={openAddForm}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        id="calories-add-meal-fab"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Sheets */}
      <MealPlanFormSheet
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        date={formDate}
        onCreated={fetchData}
      />
      <CaloriesTargetSheet
        open={targetSheetOpen}
        onOpenChange={setTargetSheetOpen}
        currentTarget={target}
        onUpdated={fetchData}
      />
    </div>
  );
}
