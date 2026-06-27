/**
 * finance.types.ts — TypeScript types for the Finance module.
 * Matches schema.sql §4.1–4.5.
 */

/** Income source (salary, freelance, etc.) */
export interface IncomeSource {
  id: string;
  name: string;
  amount_eur: number;
  frequency: 'monthly' | 'weekly' | 'onetime';
  scope: 'shared' | 'personal';
  owner_id: string | null;
  active: boolean;
  created_at: string;
}

export interface IncomeSourceFormData {
  name: string;
  amount_eur: number;
  frequency: 'monthly' | 'weekly' | 'onetime';
  scope: 'shared' | 'personal';
}

/** Fixed monthly expense (rent, insurance, etc.) */
export interface FixedExpense {
  id: string;
  name: string;
  amount_eur: number;
  day_of_month: number;
  category: string;
  scope: 'shared' | 'personal';
  owner_id: string | null;
  active: boolean;
  created_at: string;
}

export interface FixedExpenseFormData {
  name: string;
  amount_eur: number;
  day_of_month: number;
  category: string;
  scope: 'shared' | 'personal';
}

/** Expense category with monthly limit */
export interface ExpenseCategory {
  id: string;
  name: string;
  monthly_limit_eur: number;
  scope: 'shared' | 'personal';
  owner_id: string | null;
  color_hex: string;
  icon: string;
  active: boolean;
  created_at: string;
}

export interface ExpenseCategoryFormData {
  name: string;
  monthly_limit_eur: number;
  scope: 'shared' | 'personal';
  color_hex: string;
  icon: string;
}

/** Dynamic expense entry */
export interface Expense {
  id: string;
  category_id: string | null;
  amount_eur: number;
  note: string | null;
  spent_at: string;
  spent_by: string;
  created_at: string;
}

export interface ExpenseFormData {
  category_id: string | null;
  amount_eur: number;
  note: string;
  spent_at: string;
}

/** Buffer (household liquidity target) — single row */
export interface BufferSettings {
  id: string;
  target_amount_eur: number;
  current_amount_eur: number;
  last_updated_at: string;
  updated_by: string | null;
}

/** Monthly summary (computed) */
export interface CategorySpending {
  category: ExpenseCategory;
  spent: number;
}

export interface MonthlySummary {
  totalIncome: number;
  totalFixedExpenses: number;
  totalAllocated: number;
  uncategorizedSpent: number;
  remaining: number;
  categorySpending: CategorySpending[];
}
