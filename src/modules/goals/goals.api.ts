/**
 * goals.api.ts — Supabase CRUD for Goals & Dreams module.
 * RLS: shared or personal scope flag.
 * Tables: goals, goal_milestones.
 */
import { supabase } from '@/lib/supabase';
import { uploadPhoto, getSignedUrl } from '@/lib/storage';
import type { Goal, GoalFormData, GoalMilestone, GoalStatus } from './goals.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── Goals CRUD ─────────────────────────────────────────────────────────────

/** List all goals (with milestone count). */
export async function listGoals(
  statusFilter?: GoalStatus,
): Promise<Goal[]> {
  let query = supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Goal[];
}

/** Create a new goal. Optionally upload image. */
export async function createGoal(
  form: GoalFormData,
  imageFile?: File | null,
): Promise<Goal> {
  const userId = await requireUserId();

  let imagePath: string | null = null;
  if (imageFile) {
    imagePath = await uploadPhoto(imageFile, 'goal-images');
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      title: form.title,
      description: form.description || null,
      image_path: imagePath,
      status: form.status || 'dreaming',
      category: form.category || 'genel',
      scope: form.scope,
      owner_id: form.scope === 'personal' ? userId : null,
      target_date: form.target_date || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Goal;
}

/** Update a goal. */
export async function updateGoal(
  id: string,
  updates: Partial<GoalFormData> & { image_path?: string | null },
): Promise<void> {
  const userId = await requireUserId();

  const payload: Record<string, unknown> = { ...updates };
  if (updates.scope === 'personal') {
    payload.owner_id = userId;
  } else if (updates.scope === 'shared') {
    payload.owner_id = null;
  }
  if (payload.description === '') payload.description = null;
  if (payload.target_date === '') payload.target_date = null;

  const { error } = await supabase
    .from('goals')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

/** Mark a goal as achieved. */
export async function achieveGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({
      status: 'achieved',
      achieved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Upload a new image for an existing goal. */
export async function uploadGoalImage(
  goalId: string,
  file: File,
): Promise<string> {
  const path = await uploadPhoto(file, 'goal-images');

  const { error } = await supabase
    .from('goals')
    .update({ image_path: path })
    .eq('id', goalId);

  if (error) throw error;
  return path;
}

/** Get signed URL for a goal image. */
export async function getGoalImageUrl(
  path: string | null,
): Promise<string | null> {
  return getSignedUrl(path, 'goal-images');
}

// ─── Milestones CRUD ────────────────────────────────────────────────────────

/** List milestones for a goal. */
export async function listMilestones(goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('ordering', { ascending: true });

  if (error) throw error;
  return (data ?? []) as GoalMilestone[];
}

/** Add a milestone to a goal. */
export async function addMilestone(
  goalId: string,
  title: string,
  ordering?: number,
): Promise<GoalMilestone> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .insert({
      goal_id: goalId,
      title,
      ordering: ordering ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GoalMilestone;
}

/** Toggle milestone completion. */
export async function completeMilestone(
  id: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('goal_milestones')
    .update({
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Delete a milestone. */
export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase
    .from('goal_milestones')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
