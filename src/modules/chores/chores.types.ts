/**
 * chores.types.ts — Type definitions for the Chores module.
 * Maps directly to DB schema (infra/schema.sql §2.1, §2.2).
 */

export type FrequencyType =
  | 'once'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom_days';

export type InstanceStatus = 'pending' | 'completed' | 'skipped' | 'overdue';

/** DB row: chores table */
export interface Chore {
  id: string;
  title: string;
  description: string | null;
  frequency_type: FrequencyType;
  frequency_value: number;
  deadline_hours: number;
  assigned_to: string | null;
  created_by: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** DB row: chore_instances table */
export interface ChoreInstance {
  id: string;
  chore_id: string;
  due_at: string;
  assigned_to: string | null;
  status: InstanceStatus;
  completed_at: string | null;
  completed_by: string | null;
  skip_note: string | null;
  created_at: string;
}

/** Joined instance with parent chore info (for display) */
export interface ChoreInstanceWithChore extends ChoreInstance {
  chore: Pick<Chore, 'title' | 'description' | 'frequency_type' | 'frequency_value' | 'deadline_hours'>;
}

/** Form data for creating a new chore */
export interface ChoreFormData {
  title: string;
  description?: string;
  frequency_type: FrequencyType;
  frequency_value: number;
  deadline_hours: number;
  assigned_to: string | null;
  /** Optional start date for first instance (ISO string). Defaults to now. */
  start_date?: string;
}

/** Unified task item for "My Tasks" view (chore instance + personal task merged) */
export interface UnifiedTaskItem {
  id: string;
  type: 'chore' | 'personal';
  title: string;
  description: string | null;
  due_at: string | null;
  status: InstanceStatus | 'pending';
  /** For chore instances: chore_id, for personal tasks: undefined */
  chore_id?: string;
  assigned_to: string | null;
  frequency_type?: FrequencyType;
  priority?: 'low' | 'med' | 'high';
  tags?: string[];
}

/** Filter options for household view */
export type HouseholdFilter =
  | 'all'
  | 'unassigned'
  | 'mine'
  | 'partner'
  | 'today'
  | 'upcoming';
