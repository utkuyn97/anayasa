/**
 * smoking.api.ts — Supabase CRUD for Smoking Quit module.
 * RLS: personal-only (owner_id = auth.uid()).
 * Tables: smoking_quit, smoking_relapse, smoking_milestones.
 */
import { supabase } from '@/lib/supabase';
import type {
  SmokingQuit,
  SmokingQuitFormData,
  SmokingRelapse,
  SmokingMilestone,
  MilestoneKey,
} from './smoking.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── Setup ──────────────────────────────────────────────────────────────────

/** Get the quit setup for the current user. Returns null if not set up yet. */
export async function getSetup(): Promise<SmokingQuit | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('smoking_quit')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as SmokingQuit | null;
}

/** Create or update (upsert) the quit setup. */
export async function saveSetup(form: SmokingQuitFormData): Promise<SmokingQuit> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('smoking_quit')
    .upsert(
      {
        owner_id: userId,
        quit_date: form.quit_date,
        cigarettes_per_day_before: form.cigarettes_per_day_before,
        price_per_pack_eur: form.price_per_pack_eur,
        cigarettes_per_pack: form.cigarettes_per_pack,
      },
      { onConflict: 'owner_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as SmokingQuit;
}

// ─── Relapses ───────────────────────────────────────────────────────────────

/** List all relapses, most recent first. */
export async function listRelapses(): Promise<SmokingRelapse[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('smoking_relapse')
    .select('*')
    .eq('owner_id', userId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SmokingRelapse[];
}

/** Add a relapse event. */
export async function addRelapse(
  note?: string,
  count?: number,
): Promise<SmokingRelapse> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('smoking_relapse')
    .insert({
      owner_id: userId,
      occurred_at: new Date().toISOString(),
      count: count ?? 1,
      note: note || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SmokingRelapse;
}

// ─── Milestones ─────────────────────────────────────────────────────────────

/** List all achieved milestones. */
export async function getMilestones(): Promise<SmokingMilestone[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('smoking_milestones')
    .select('*')
    .eq('owner_id', userId)
    .order('achieved_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SmokingMilestone[];
}

/** Achieve a milestone. */
export async function achieveMilestone(key: MilestoneKey): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('smoking_milestones')
    .insert({
      owner_id: userId,
      milestone_key: key,
      achieved_at: new Date().toISOString(),
    });

  // Ignore unique violation (already achieved)
  if (error && !error.message.includes('duplicate')) throw error;
}
