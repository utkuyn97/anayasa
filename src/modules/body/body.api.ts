/**
 * body.api.ts — Supabase CRUD for Body measurements.
 * RLS: personal-only (owner_id = auth.uid()).
 * Table: body_measurements.
 */
import { supabase } from '@/lib/supabase';
import type { BodyMeasurement, BodyMeasurementFormData } from './body.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

/** List measurements for current user, ordered by date desc. */
export async function listMeasurements(
  days?: number,
): Promise<BodyMeasurement[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('body_measurements')
    .select('*')
    .eq('owner_id', userId)
    .order('measured_at', { ascending: false });

  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    query = query.gte('measured_at', since.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BodyMeasurement[];
}

/** Create a new measurement. */
export async function createMeasurement(
  form: BodyMeasurementFormData,
): Promise<BodyMeasurement> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      owner_id: userId,
      measured_at: form.measured_at,
      weight_kg: form.weight_kg,
      body_fat_pct: form.body_fat_pct,
      waist_cm: form.waist_cm,
      chest_cm: form.chest_cm,
      arm_cm: form.arm_cm,
      hip_cm: form.hip_cm,
      note: form.note || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BodyMeasurement;
}

/** Delete a measurement. */
export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
