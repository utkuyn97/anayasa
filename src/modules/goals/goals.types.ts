/**
 * goals.types.ts — TypeScript types for the Goals & Dreams module.
 * Matches schema.sql §5.6–5.7.
 */

/** Goal status. */
export type GoalStatus = 'dreaming' | 'planned' | 'in_progress' | 'achieved' | 'paused';

/** Goal record. */
export interface Goal {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  status: GoalStatus;
  category: string;
  scope: 'shared' | 'personal';
  owner_id: string | null;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Form data for creating/updating a goal. */
export interface GoalFormData {
  title: string;
  description: string;
  category: string;
  scope: 'shared' | 'personal';
  target_date: string;
  status: GoalStatus;
}

/** Goal milestone record. */
export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  completed_at: string | null;
  ordering: number;
  created_at: string;
}
