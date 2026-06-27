/**
 * chores.helpers.ts — Pure helper functions for chore scheduling.
 *
 * Key concept: "lazy materialization" (D-0008).
 * When user opens the list, frontend checks if upcoming instances exist.
 * If not, it generates them for the next N days.
 */
import {
  addHours,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  isAfter,
  isBefore,
  endOfDay,
} from 'date-fns';
import type {
  Chore,
  ChoreInstance,
  UnifiedTaskItem,
} from './chores.types';
import type { PersonalTask } from '../personal-tasks/personalTasks.types';

/**
 * Compute the next due_at date for a chore based on its frequency.
 * @param chore - The chore definition
 * @param lastDueAt - The due_at of the most recent instance (or null for first)
 * @returns Next due_at as ISO string
 */
export function computeNextDueAt(
  chore: Pick<Chore, 'frequency_type' | 'frequency_value'>,
  lastDueAt: Date | null,
): Date {
  const base = lastDueAt ?? new Date();

  switch (chore.frequency_type) {
    case 'once':
      // One-off: due now (or specified time)
      return lastDueAt ?? new Date();

    case 'hourly':
      return addHours(base, chore.frequency_value);

    case 'daily':
      return addDays(base, chore.frequency_value);

    case 'weekly':
      return addWeeks(base, chore.frequency_value);

    case 'monthly':
      return addMonths(base, chore.frequency_value);

    case 'custom_days':
      return addDays(base, chore.frequency_value);

    default:
      return addDays(base, 1);
  }
}

/**
 * Given a chore and its existing instances, determine which new instances
 * need to be created to cover the next `lookAheadDays`.
 *
 * Returns array of { due_at, assigned_to } for instances to INSERT.
 */
export function computeMissingInstances(
  chore: Chore,
  existingInstances: Pick<ChoreInstance, 'due_at' | 'status'>[],
  lookAheadDays: number = 30,
): Array<{ due_at: string; assigned_to: string | null }> {
  // One-off chores: only 1 instance ever
  if (chore.frequency_type === 'once') {
    if (existingInstances.length > 0) return [];
    return [{
      due_at: new Date().toISOString(),
      assigned_to: chore.assigned_to,
    }];
  }

  // For recurring: find the latest existing instance due_at
  const horizon = endOfDay(addDays(new Date(), lookAheadDays));
  const sortedExisting = [...existingInstances]
    .map((i) => new Date(i.due_at))
    .sort((a, b) => b.getTime() - a.getTime());

  let lastDue = sortedExisting[0] ?? null;

  // If no instances exist, start from now
  if (!lastDue) {
    lastDue = startOfDay(new Date());
  }

  const missing: Array<{ due_at: string; assigned_to: string | null }> = [];
  let nextDue = computeNextDueAt(chore, lastDue);

  // Safety: max 365 iterations to prevent infinite loops
  let safety = 0;
  while (isBefore(nextDue, horizon) && safety < 365) {
    // Only add if there's no existing instance on the same calendar date (UTC)
    const nextDateStr = nextDue.toISOString().slice(0, 10);
    const alreadyExists = existingInstances.some((ei) =>
      new Date(ei.due_at).toISOString().slice(0, 10) === nextDateStr,
    );
    if (!alreadyExists) {
      missing.push({
        due_at: nextDue.toISOString(),
        assigned_to: chore.assigned_to,
      });
    }
    nextDue = computeNextDueAt(chore, nextDue);
    safety++;
  }

  return missing;
}

/**
 * Determine if a pending instance is overdue based on its deadline.
 */
export function isInstanceOverdue(
  instance: Pick<ChoreInstance, 'due_at' | 'status'>,
  deadlineHours: number,
): boolean {
  if (instance.status !== 'pending') return false;
  const deadline = addHours(new Date(instance.due_at), deadlineHours);
  return isAfter(new Date(), deadline);
}

/**
 * Merge chore instances and personal tasks into a unified sorted list
 * for the "My Tasks" (Görevlerim) view.
 *
 * - Only includes instances assigned to the current user (pre-filtered)
 * - Only includes pending/overdue personal tasks (pre-filtered)
 * - Sorted by due_at ascending (earliest first), nulls at end
 */
export function mergeMyTasks(
  myInstances: Array<ChoreInstance & { chore: Pick<Chore, 'title' | 'description' | 'frequency_type' | 'deadline_hours'> }>,
  myPersonalTasks: PersonalTask[],
): UnifiedTaskItem[] {
  const choreItems: UnifiedTaskItem[] = myInstances.map((inst) => ({
    id: inst.id,
    type: 'chore' as const,
    title: inst.chore.title,
    description: inst.chore.description,
    due_at: inst.due_at,
    status: isInstanceOverdue(inst, inst.chore.deadline_hours)
      ? 'overdue' as const
      : inst.status,
    chore_id: inst.chore_id,
    assigned_to: inst.assigned_to,
    frequency_type: inst.chore.frequency_type,
  }));

  const personalItems: UnifiedTaskItem[] = myPersonalTasks.map((pt) => ({
    id: pt.id,
    type: 'personal' as const,
    title: pt.title,
    description: pt.description,
    due_at: pt.due_at,
    status: 'pending' as const,
    assigned_to: pt.owner_id,
    priority: pt.priority,
    tags: pt.tags ?? undefined,
  }));

  const merged = [...choreItems, ...personalItems];

  // Sort: due_at ascending, nulls at end
  merged.sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return merged;
}

/**
 * Calculate completion rate for the current week.
 * @returns percentage 0-100
 */
export function calculateWeeklyCompletionRate(
  instances: Pick<ChoreInstance, 'status' | 'due_at'>[],
): number {
  const now = new Date();
  const weekStart = startOfDay(addDays(now, -now.getDay()));
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const thisWeek = instances.filter((i) => {
    const d = new Date(i.due_at);
    return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
  });

  if (thisWeek.length === 0) return 100;

  const completed = thisWeek.filter(
    (i) => i.status === 'completed',
  ).length;

  return Math.round((completed / thisWeek.length) * 100);
}
