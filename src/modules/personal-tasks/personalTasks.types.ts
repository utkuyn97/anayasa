/**
 * personalTasks.types.ts — Type definitions for Personal Tasks module.
 * Maps to DB schema (infra/schema.sql §2.3).
 */

export type Priority = 'low' | 'med' | 'high';

/** DB row: personal_tasks table */
export interface PersonalTask {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: Priority;
  tags: string[] | null;
  completed_at: string | null;
  /** Recurrence: null = one-time, 'daily'|'weekly'|'monthly' = auto-recreate on complete */
  recurrence: PersonalRecurrence | null;
  created_at: string;
  updated_at: string;
}

export type PersonalRecurrence = 'daily' | 'weekly' | 'monthly';

/** Form data for creating/updating a personal task */
export interface PersonalTaskFormData {
  title: string;
  description?: string;
  due_at?: string;
  priority: Priority;
  tags?: string[];
  recurrence?: PersonalRecurrence;
}

/** Filter for personal tasks view */
export type PersonalTaskFilter = 'open' | 'completed' | 'all';
