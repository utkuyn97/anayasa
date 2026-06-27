/**
 * finance.api.ts — Supabase CRUD for Finance module.
 * RLS: scope-based (shared = all household, personal = owner only).
 * Tables: income_sources, fixed_expenses, expense_categories, expenses, buffer_settings.
 */
import { supabase } from '@/lib/supabase';
import type {
  IncomeSource,
  IncomeSourceFormData,
  FixedExpense,
  FixedExpenseFormData,
  ExpenseCategory,
  ExpenseCategoryFormData,
  Expense,
  ExpenseFormData,
  BufferSettings,
  MonthlySummary,
  CategorySpending,
} from './finance.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── Income Sources ─────────────────────────────────────────────────────────

export async function listIncomeSources(): Promise<IncomeSource[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as IncomeSource[];
}

export async function createIncomeSource(
  form: IncomeSourceFormData,
): Promise<IncomeSource> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('income_sources')
    .insert({
      name: form.name,
      amount_eur: form.amount_eur,
      frequency: form.frequency,
      scope: form.scope,
      owner_id: form.scope === 'personal' ? userId : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as IncomeSource;
}

export async function updateIncomeSource(
  id: string,
  form: Partial<IncomeSourceFormData>,
): Promise<void> {
  const userId = await requireUserId();

  const updates: Record<string, unknown> = { ...form };
  if (form.scope === 'personal') {
    updates.owner_id = userId;
  } else if (form.scope === 'shared') {
    updates.owner_id = null;
  }

  const { error } = await supabase
    .from('income_sources')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const { error } = await supabase
    .from('income_sources')
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
}

// ─── Fixed Expenses ─────────────────────────────────────────────────────────

export async function listFixedExpenses(): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('active', true)
    .order('day_of_month', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FixedExpense[];
}

export async function createFixedExpense(
  form: FixedExpenseFormData,
): Promise<FixedExpense> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      name: form.name,
      amount_eur: form.amount_eur,
      day_of_month: form.day_of_month,
      category: form.category,
      scope: form.scope,
      owner_id: form.scope === 'personal' ? userId : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FixedExpense;
}

export async function updateFixedExpense(
  id: string,
  form: Partial<FixedExpenseFormData>,
): Promise<void> {
  const userId = await requireUserId();

  const updates: Record<string, unknown> = { ...form };
  if (form.scope === 'personal') {
    updates.owner_id = userId;
  } else if (form.scope === 'shared') {
    updates.owner_id = null;
  }

  const { error } = await supabase
    .from('fixed_expenses')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('fixed_expenses')
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
}

// ─── Expense Categories ─────────────────────────────────────────────────────

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExpenseCategory[];
}

export async function createExpenseCategory(
  form: ExpenseCategoryFormData,
): Promise<ExpenseCategory> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name: form.name,
      monthly_limit_eur: form.monthly_limit_eur,
      scope: form.scope,
      owner_id: form.scope === 'personal' ? userId : null,
      color_hex: form.color_hex,
      icon: form.icon,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseCategory;
}

export async function updateExpenseCategory(
  id: string,
  form: Partial<ExpenseCategoryFormData>,
): Promise<void> {
  const userId = await requireUserId();

  const updates: Record<string, unknown> = { ...form };
  if (form.scope === 'personal') {
    updates.owner_id = userId;
  } else if (form.scope === 'shared') {
    updates.owner_id = null;
  }

  const { error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export async function listExpenses(
  year: number,
  month: number,
): Promise<Expense[]> {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 1).toISOString();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('spent_at', startDate)
    .lt('spent_at', endDate)
    .order('spent_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createExpense(form: ExpenseFormData): Promise<Expense> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category_id: form.category_id || null,
      amount_eur: form.amount_eur,
      note: form.note || null,
      spent_at: form.spent_at,
      spent_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);

  if (error) throw error;
}

// ─── Buffer ─────────────────────────────────────────────────────────────────

export async function getBufferSettings(): Promise<BufferSettings | null> {
  const { data, error } = await supabase
    .from('buffer_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as BufferSettings | null;
}

export async function updateBufferSettings(
  updates: { target_amount_eur?: number; current_amount_eur?: number },
): Promise<void> {
  const userId = await requireUserId();

  // Get existing or create
  const existing = await getBufferSettings();

  if (existing) {
    const { error } = await supabase
      .from('buffer_settings')
      .update({
        ...updates,
        updated_by: userId,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from('buffer_settings').insert({
      target_amount_eur: updates.target_amount_eur ?? 0,
      current_amount_eur: updates.current_amount_eur ?? 0,
      updated_by: userId,
    });

    if (error) throw error;
  }
}

// ─── Monthly Summary ────────────────────────────────────────────────────────

/**
 * Compute the monthly financial summary.
 * totalIncome: weekly × 4 + monthly + onetime (only for the given month).
 */
export async function getMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const [incomes, fixedExpenses, categories, expenses] = await Promise.all([
    listIncomeSources(),
    listFixedExpenses(),
    listExpenseCategories(),
    listExpenses(year, month),
  ]);

  // Calculate total monthly income
  let totalIncome = 0;
  for (const inc of incomes) {
    switch (inc.frequency) {
      case 'monthly':
        totalIncome += Number(inc.amount_eur);
        break;
      case 'weekly':
        totalIncome += Number(inc.amount_eur) * 4;
        break;
      case 'onetime':
        // Onetime income only counted once (when created)
        totalIncome += Number(inc.amount_eur);
        break;
    }
  }

  // Calculate total fixed expenses
  const totalFixedExpenses = fixedExpenses.reduce(
    (sum, fe) => sum + Number(fe.amount_eur),
    0,
  );

  // Calculate per-category spending
  const spendingMap = new Map<string, number>();
  for (const exp of expenses) {
    if (!exp.category_id) continue;
    const current = spendingMap.get(exp.category_id) ?? 0;
    spendingMap.set(exp.category_id, current + Number(exp.amount_eur));
  }

  const categorySpending: CategorySpending[] = categories.map((cat) => ({
    category: cat,
    spent: spendingMap.get(cat.id) ?? 0,
  }));

  // Sum of actual dynamic spending
  const totalSpent = expenses.reduce(
    (sum, e) => sum + Number(e.amount_eur),
    0,
  );

  // Uncategorized spending (expenses without category)
  const uncategorizedSpent = expenses
    .filter((e) => !e.category_id)
    .reduce((sum, e) => sum + Number(e.amount_eur), 0);

  return {
    totalIncome,
    totalFixedExpenses,
    totalAllocated: totalSpent,
    uncategorizedSpent,
    remaining: totalIncome - totalFixedExpenses - totalSpent,
    categorySpending,
  };
}
