/**
 * chores.api.ts — Supabase CRUD operations for chores and chore_instances.
 *
 * All queries go through RLS (household policy).
 * Lazy materialization: computeMissingInstances → bulk insert.
 */
import { supabase } from '@/lib/supabase';
import type {
  Chore,
  ChoreInstanceWithChore,
  ChoreFormData,
} from './chores.types';
import { computeMissingInstances } from './chores.helpers';

// ─── Chore CRUD ───────────────────────────────────────────

/** List all active chores. */
export async function listActiveChores(): Promise<Chore[]> {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Chore[];
}

/** Create a new chore + materialize the first instance. */
export async function createChore(form: ChoreFormData): Promise<Chore> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('chores')
    .insert({
      title: form.title,
      description: form.description ?? null,
      frequency_type: form.frequency_type,
      frequency_value: form.frequency_value,
      deadline_hours: form.deadline_hours,
      assigned_to: form.assigned_to,
      created_by: userData.user.id,
      active: form.frequency_type !== 'once',
    })
    .select()
    .single();

  if (error) throw error;
  const chore = data as Chore;

  // Materialize first instance — use start_date if provided, else now
  const firstDue = form.start_date ? new Date(form.start_date) : new Date();
  await supabase.from('chore_instances').insert({
    chore_id: chore.id,
    due_at: firstDue.toISOString(),
    assigned_to: chore.assigned_to,
  });

  return chore;
}

/** Update a chore definition (not instances). */
export async function updateChore(
  id: string,
  updates: Partial<ChoreFormData>,
): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .update(updates)
    .eq('id', id);

  if (error) throw error;

  // If assigned_to changed, also update all pending instances
  if ('assigned_to' in updates) {
    const { error: instError } = await supabase
      .from('chore_instances')
      .update({ assigned_to: updates.assigned_to ?? null })
      .eq('chore_id', id)
      .eq('status', 'pending');

    if (instError) throw instError;
  }
}

/** Permanently delete a chore and all its instances. */
export async function deleteChore(id: string): Promise<void> {
  // 1. Delete all instances first (FK constraint)
  const { error: instError } = await supabase
    .from('chore_instances')
    .delete()
    .eq('chore_id', id);

  if (instError) throw instError;

  // 2. Delete the chore itself
  const { error } = await supabase
    .from('chores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Archive (soft-delete) a chore — keeps history but stops new instances. */
export async function archiveChore(id: string): Promise<void> {
  // Cancel all pending instances
  const { error: instError } = await supabase
    .from('chore_instances')
    .delete()
    .eq('chore_id', id)
    .eq('status', 'pending');

  if (instError) throw instError;

  const { error } = await supabase
    .from('chores')
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
}

/** Delete a single chore instance (the parent chore is NOT affected). */
export async function deleteInstance(id: string): Promise<void> {
  const { error } = await supabase
    .from('chore_instances')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Chore Instance Operations ────────────────────────────

/** List instances with parent chore info. Supports filtering. */
export async function listInstances(filter?: {
  status?: string;
  assigned_to?: string | null;
  from?: string;
  to?: string;
}): Promise<ChoreInstanceWithChore[]> {
  let query = supabase
    .from('chore_instances')
    .select(`
      *,
      chore:chores!chore_id(title, description, frequency_type, frequency_value, deadline_hours)
    `)
    .order('due_at', { ascending: true });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }
  if (filter?.assigned_to !== undefined) {
    if (filter.assigned_to === null) {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', filter.assigned_to);
    }
  }
  if (filter?.from) {
    query = query.gte('due_at', filter.from);
  }
  if (filter?.to) {
    query = query.lte('due_at', filter.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ChoreInstanceWithChore[];
}

/** Complete a chore instance. */
export async function completeInstance(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chore_instances')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userData.user.id,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Undo completion — set back to pending. */
export async function undoCompleteInstance(id: string): Promise<void> {
  const { error } = await supabase
    .from('chore_instances')
    .update({
      status: 'pending',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Skip instance with optional note. */
export async function skipInstance(
  id: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('chore_instances')
    .update({
      status: 'skipped',
      skip_note: note ?? null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reassign a single instance (tek seferlik devir).
 * D-0016: Only updates chore_instances.assigned_to.
 */
export async function reassignInstance(
  instanceId: string,
  newAssignee: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('chore_instances')
    .update({ assigned_to: newAssignee })
    .eq('id', instanceId);

  if (error) throw error;
}

/**
 * Reassign a chore permanently (kalıcı atama değişimi).
 * D-0016: Only updates chores.assigned_to. Past/pending instances untouched.
 */
export async function reassignChore(
  choreId: string,
  newAssignee: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .update({ assigned_to: newAssignee })
    .eq('id', choreId);

  if (error) throw error;

  // Also update all pending instances to the new assignee
  const { error: instError } = await supabase
    .from('chore_instances')
    .update({ assigned_to: newAssignee })
    .eq('chore_id', choreId)
    .eq('status', 'pending');

  if (instError) throw instError;
}

/**
 * Claim an unassigned instance (Üstüme al).
 * Sets chore_instances.assigned_to = current user.
 */
export async function claimInstance(instanceId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chore_instances')
    .update({ assigned_to: userData.user.id })
    .eq('id', instanceId);

  if (error) throw error;
}

/**
 * Lazy materialize: check active chores and create missing instances
 * for the next lookAheadDays.
 */
export async function materializeAllChores(
  lookAheadDays: number = 14,
): Promise<number> {
  const chores = await listActiveChores();
  let totalCreated = 0;

  for (const chore of chores) {
    const { data: existing } = await supabase
      .from('chore_instances')
      .select('due_at, status')
      .eq('chore_id', chore.id)
      .order('due_at', { ascending: false })
      .limit(50);

    const missing = computeMissingInstances(
      chore,
      existing ?? [],
      lookAheadDays,
    );

    if (missing.length > 0) {
      const { error } = await supabase
        .from('chore_instances')
        .insert(
          missing.map((m) => ({
            chore_id: chore.id,
            due_at: m.due_at,
            assigned_to: m.assigned_to,
          })),
        );

      if (error) throw error;
      totalCreated += missing.length;
    }
  }

  return totalCreated;
}
