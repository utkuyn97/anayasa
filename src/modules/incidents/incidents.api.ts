/**
 * incidents.api.ts — Supabase CRUD for incidents.
 * RLS: household policy (both users can read/write).
 * Includes photo upload via storage.ts helpers.
 */
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/storage';
import type { Incident, IncidentFormData } from './incidents.types';

/** List all incidents ordered by reported_at DESC. */
export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('reported_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Incident[];
}

/** Create a new incident, optionally with a photo. */
export async function createIncident(
  form: IncidentFormData,
): Promise<Incident> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  let photoPath: string | null = null;
  if (form.photo) {
    photoPath = await uploadPhoto(form.photo, 'incident-photos');
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      title: form.title,
      description: form.description,
      category: form.category,
      severity: form.severity,
      photo_path: photoPath,
      reported_by: userData.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Incident;
}

/** Mark an incident as resolved. */
export async function resolveIncident(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('incidents')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userData.user.id,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Delete an incident permanently. */
export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
