/**
 * calendar.api.ts — Supabase CRUD for Calendar module.
 * RLS: shared events visible to household, personal events to owner only.
 * Table: calendar_events.
 */
import { supabase } from '@/lib/supabase';
import type { CalendarEvent, CalendarEventFormData } from './calendar.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

/** List events within a date range. */
export async function listEvents(
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_at', start)
    .lte('start_at', end)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

/** Create a new event. */
export async function createEvent(
  form: CalendarEventFormData,
): Promise<CalendarEvent> {
  const userId = await requireUserId();

  const { data: userData } = await supabase
    .from('allowed_users')
    .select('color_hex')
    .eq('id', userId)
    .single();

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: form.title,
      description: form.description || null,
      start_at: form.start_at,
      end_at: form.end_at || null,
      all_day: form.all_day,
      location: form.location || null,
      scope: form.scope,
      owner_id: form.scope === 'personal' ? userId : null,
      color_hex: form.color_hex || userData?.color_hex || '#3b82f6',
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}

/** Update an existing event. */
export async function updateEvent(
  id: string,
  form: Partial<CalendarEventFormData>,
): Promise<void> {
  const userId = await requireUserId();

  const updates: Record<string, unknown> = { ...form };
  if (form.scope === 'personal') {
    updates.owner_id = userId;
  } else if (form.scope === 'shared') {
    updates.owner_id = null;
  }
  // Normalize empty strings to null
  if (updates.description === '') updates.description = null;
  if (updates.location === '') updates.location = null;
  if (updates.end_at === '') updates.end_at = null;

  const { error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

/** Delete an event. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
