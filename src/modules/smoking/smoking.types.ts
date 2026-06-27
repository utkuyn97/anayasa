/**
 * smoking.types.ts — TypeScript types for the Smoking Quit module.
 * Matches schema.sql §5.3–5.5.
 */

/** Quit setup (one row per user). */
export interface SmokingQuit {
  owner_id: string;
  quit_date: string;
  cigarettes_per_day_before: number;
  price_per_pack_eur: number;
  cigarettes_per_pack: number;
  created_at: string;
  updated_at: string;
}

export interface SmokingQuitFormData {
  quit_date: string;
  cigarettes_per_day_before: number;
  price_per_pack_eur: number;
  cigarettes_per_pack: number;
}

/** Relapse record. */
export interface SmokingRelapse {
  id: string;
  owner_id: string;
  occurred_at: string;
  count: number;
  note: string | null;
  created_at: string;
}

/** Milestone key type. */
export type MilestoneKey = '24h' | '72h' | '7d' | '30d' | '90d' | '180d' | '365d';

/** Milestone record. */
export interface SmokingMilestone {
  id: string;
  owner_id: string;
  milestone_key: MilestoneKey;
  achieved_at: string;
}

/** Milestone definition for display. */
export interface MilestoneDefinition {
  key: MilestoneKey;
  durationMs: number;
  labelKey: string;
  descriptionKey: string;
}
