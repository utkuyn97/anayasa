/**
 * calories.api.ts — Supabase CRUD for Calories & Macro module.
 * RLS: personal-only (owner_id = auth.uid()).
 * Tables: daily_targets, meal_plans.
 */
import { supabase } from '@/lib/supabase';
import type {
  DailyTarget,
  DailyTargetFormData,
  MealPlan,
  MealPlanFormData,
} from './calories.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── Daily Targets ──────────────────────────────────────────────────────────

export async function getDailyTarget(): Promise<DailyTarget | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as DailyTarget | null;
}

export async function upsertDailyTarget(
  form: DailyTargetFormData,
): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase.from('daily_targets').upsert(
    {
      owner_id: userId,
      target_calories: form.target_calories,
      target_protein_g: form.target_protein_g,
      target_carbs_g: form.target_carbs_g,
      target_fat_g: form.target_fat_g,
    },
    { onConflict: 'owner_id' },
  );

  if (error) throw error;
}

// ─── Meal Plans ─────────────────────────────────────────────────────────────

export async function listMealPlans(date: string): Promise<MealPlan[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('owner_id', userId)
    .eq('plan_date', date)
    .order('meal_type', { ascending: true })
    .order('planned_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MealPlan[];
}

export async function createMealPlan(
  date: string,
  form: MealPlanFormData,
): Promise<MealPlan> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      owner_id: userId,
      plan_date: date,
      meal_type: form.meal_type,
      food_name: form.food_name,
      amount_g: form.amount_g,
      calories: form.calories,
      protein_g: form.protein_g,
      carbs_g: form.carbs_g,
      fat_g: form.fat_g,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MealPlan;
}

export async function updateMealPlan(
  id: string,
  form: Partial<MealPlanFormData>,
): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .update(form)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteMealPlan(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plans').delete().eq('id', id);

  if (error) throw error;
}

export async function markEaten(id: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .update({
      eaten: true,
      eaten_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function unmarkEaten(id: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .update({
      eaten: false,
      eaten_at: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Copy all meals from one date to another.
 * Useful for quick "copy yesterday's plan" workflow.
 */
export async function copyDayPlan(
  fromDate: string,
  toDate: string,
): Promise<void> {
  const userId = await requireUserId();

  // Get source meals
  const sourceMeals = await listMealPlans(fromDate);
  if (sourceMeals.length === 0) return;

  // Create copies for target date
  const copies = sourceMeals.map((meal) => ({
    owner_id: userId,
    plan_date: toDate,
    meal_type: meal.meal_type,
    food_name: meal.food_name,
    amount_g: meal.amount_g,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    eaten: false,
    eaten_at: null,
  }));

  const { error } = await supabase.from('meal_plans').insert(copies);
  if (error) throw error;
}
