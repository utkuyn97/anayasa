/**
 * calories.types.ts — TypeScript types for Calories & Macro module.
 * Matches schema.sql §4.6–4.7.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Daily calorie/macro targets — one row per user. */
export interface DailyTarget {
  owner_id: string;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  updated_at: string;
}

export interface DailyTargetFormData {
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}

/** Single meal plan entry. */
export interface MealPlan {
  id: string;
  owner_id: string;
  plan_date: string; // DATE as 'YYYY-MM-DD'
  meal_type: MealType;
  food_name: string;
  amount_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  eaten: boolean;
  eaten_at: string | null;
  planned_at: string;
}

export interface MealPlanFormData {
  meal_type: MealType;
  food_name: string;
  amount_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Aggregated daily totals (computed on frontend). */
export interface DailyTotals {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  eatenCalories: number;
  eatenProtein: number;
  eatenCarbs: number;
  eatenFat: number;
}
