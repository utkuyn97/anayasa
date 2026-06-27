/**
 * personalTasks.api.ts — Supabase CRUD for personal tasks.
 *
 * RLS: owner_id = auth.uid() — only owner can see/edit own tasks.
 * Recurring: when a recurring task is completed, a new copy is auto-created
 * with the next due_at based on the recurrence type.
 */
import { supabase } from '@/lib/supabase';
import { addDays, addWeeks, addMonths } from 'date-fns';
import type {
  PersonalTask,
  PersonalTaskFormData,
  PersonalRecurrence,
} from './personalTasks.types';

/** List personal tasks for the current user. */
export async function listPersonalTasks(opts?: {
  includeCompleted?: boolean;
}): Promise<PersonalTask[]> {
  // End of today (23:59:59) — don't show future recurring tasks
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let query = supabase
    .from('personal_tasks')
    .select('*')
    .order('due_at', { ascending: true, nullsFirst: false });

  if (!opts?.includeCompleted) {
    query = query.is('completed_at', null);
  }

  // Hide future DAILY recurring tasks (they'll appear on their due date).
  // Weekly/monthly recurring + all non-recurring tasks always show.
  const { data, error } = await query;
  if (error) throw error;
  const all = (data ?? []) as PersonalTask[];

  return all.filter((t) => {
    // Non-recurring or no due date: always show
    if (!t.recurrence || !t.due_at) return true;
    // Weekly/monthly: always show (user needs advance notice)
    if (t.recurrence !== 'daily') return true;
    // Daily: only show if due today or earlier
    return new Date(t.due_at) <= endOfToday;
  });
}

/** Create a personal task. owner_id is auto-set from auth. */
export async function createPersonalTask(
  form: PersonalTaskFormData,
): Promise<PersonalTask> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('personal_tasks')
    .insert({
      owner_id: userData.user.id,
      title: form.title,
      description: form.description ?? null,
      due_at: form.due_at ?? null,
      priority: form.priority,
      tags: form.tags ?? null,
      recurrence: form.recurrence ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PersonalTask;
}

/** Update a personal task. */
export async function updatePersonalTask(
  id: string,
  updates: Partial<PersonalTaskFormData>,
): Promise<void> {
  const { error } = await supabase
    .from('personal_tasks')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Compute next due_at based on recurrence type.
 */
function computeNextDueAt(
  currentDueAt: string | null,
  recurrence: PersonalRecurrence,
): string {
  const base = currentDueAt ? new Date(currentDueAt) : new Date();

  switch (recurrence) {
    case 'daily':
      return addDays(base, 1).toISOString();
    case 'weekly':
      return addWeeks(base, 1).toISOString();
    case 'monthly':
      return addMonths(base, 1).toISOString();
    default:
      return addDays(base, 1).toISOString();
  }
}

/**
 * Complete a personal task.
 * If the task has recurrence, auto-create the next occurrence.
 */
export async function completePersonalTask(id: string): Promise<void> {
  // 1. Fetch the task to check recurrence
  const { data: task, error: fetchError } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  const pt = task as PersonalTask;

  // 2. Mark as completed
  const { error } = await supabase
    .from('personal_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  // 3. If recurring, create the next occurrence
  if (pt.recurrence) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const nextDueAt = computeNextDueAt(pt.due_at, pt.recurrence);

    await supabase.from('personal_tasks').insert({
      owner_id: userData.user.id,
      title: pt.title,
      description: pt.description,
      due_at: nextDueAt,
      priority: pt.priority,
      tags: pt.tags,
      recurrence: pt.recurrence,
    });
  }
}

/** Undo completion of a personal task. */
export async function uncompletePersonalTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('personal_tasks')
    .update({ completed_at: null })
    .eq('id', id);

  if (error) throw error;
}

/** Delete a personal task. */
export async function deletePersonalTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('personal_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
