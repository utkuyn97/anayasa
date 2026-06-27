/**
 * smoking.helpers.ts — Pure computation helpers for Smoking module.
 *
 * No side effects, no Supabase calls. Used by SmokingPage + useSmokingTimer.
 */
import type { MilestoneKey, MilestoneDefinition } from './smoking.types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** All milestone definitions with durations in ms. */
export const MILESTONES: MilestoneDefinition[] = [
  { key: '24h', durationMs: DAY, labelKey: 'smoking.milestone.24h', descriptionKey: 'smoking.milestone.24hDesc' },
  { key: '72h', durationMs: 3 * DAY, labelKey: 'smoking.milestone.72h', descriptionKey: 'smoking.milestone.72hDesc' },
  { key: '7d', durationMs: 7 * DAY, labelKey: 'smoking.milestone.7d', descriptionKey: 'smoking.milestone.7dDesc' },
  { key: '30d', durationMs: 30 * DAY, labelKey: 'smoking.milestone.30d', descriptionKey: 'smoking.milestone.30dDesc' },
  { key: '90d', durationMs: 90 * DAY, labelKey: 'smoking.milestone.90d', descriptionKey: 'smoking.milestone.90dDesc' },
  { key: '180d', durationMs: 180 * DAY, labelKey: 'smoking.milestone.180d', descriptionKey: 'smoking.milestone.180dDesc' },
  { key: '365d', durationMs: 365 * DAY, labelKey: 'smoking.milestone.365d', descriptionKey: 'smoking.milestone.365dDesc' },
];

/**
 * Compute duration in ms since quit (or last relapse).
 * Formula: now - max(quit_date, last_relapse_occurred_at)
 */
export function computeDuration(
  quitDate: string,
  lastRelapseAt: string | null,
): number {
  const reference = lastRelapseAt
    ? Math.max(new Date(quitDate).getTime(), new Date(lastRelapseAt).getTime())
    : new Date(quitDate).getTime();
  return Math.max(0, Date.now() - reference);
}

/**
 * Compute total savings in EUR.
 * Formula: (days) × (cigarettes_per_day) × (price_per_pack / cigarettes_per_pack)
 */
export function computeSavings(
  durationMs: number,
  perDay: number,
  packPrice: number,
  packSize: number,
): number {
  const days = durationMs / DAY;
  const pricePerCig = packPrice / packSize;
  return days * perDay * pricePerCig;
}

/**
 * Break down duration into days, hours, minutes, seconds.
 */
export function breakdownDuration(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

/**
 * Check which milestones should be achieved based on current duration.
 */
export function checkMilestones(
  durationMs: number,
  alreadyAchieved: Set<MilestoneKey>,
): MilestoneKey[] {
  return MILESTONES
    .filter((m) => durationMs >= m.durationMs && !alreadyAchieved.has(m.key))
    .map((m) => m.key);
}
