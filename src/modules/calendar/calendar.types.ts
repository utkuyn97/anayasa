/**
 * calendar.types.ts — TypeScript types for the Calendar module.
 * Matches schema.sql §5.1.
 */

/** Calendar event record. */
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  scope: 'shared' | 'personal';
  owner_id: string | null;
  color_hex: string;
  created_by: string;
  created_at: string;
}

/** Form data for creating/updating a calendar event. */
export interface CalendarEventFormData {
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  scope: 'shared' | 'personal';
  color_hex?: string;
}
