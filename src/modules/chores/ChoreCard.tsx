/**
 * ChoreCard.tsx — Single chore instance card.
 *
 * Features:
 * - Avatar (assigned person or "?" for unassigned)
 * - Title, frequency badge, relative due_at
 * - Tap (short) → complete + 3s undo toast
 * - Long-press (≥500ms) or "..." button → ChoreActionsSheet
 * - "Üstüme al" CTA for unassigned cards
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MoreHorizontal,
  Clock,
  AlertTriangle,
  Hand,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import { useUsers } from '@/hooks/useUsers';
import { isInstanceOverdue } from './chores.helpers';
import type { ChoreInstanceWithChore } from './chores.types';

interface ChoreCardProps {
  instance: ChoreInstanceWithChore;
  onActionsOpen: (instance: ChoreInstanceWithChore) => void;
  onClaim?: (id: string) => void;
  /** Show type badge (🏠) — used in MyTasksView */
  showTypeBadge?: boolean;
}

export default function ChoreCard({
  instance,
  onActionsOpen,
  onClaim,
  showTypeBadge = false,
}: ChoreCardProps) {
  const { t } = useTranslation();
  const { getUserById } = useUsers();

  const assignedUser = instance.assigned_to
    ? getUserById(instance.assigned_to)
    : null;
  const isUnassigned = !instance.assigned_to;
  const overdue = isInstanceOverdue(instance, instance.chore.deadline_hours);
  const isCompleted = instance.status === 'completed';

  const frequencyLabel = t(`chores.frequency.${instance.chore.frequency_type}`);

  // Tap card → open actions sheet (complete is only via the sheet)
  const handleCardClick = useCallback(() => {
    onActionsOpen(instance);
  }, [instance, onActionsOpen]);

  return (
    <Card
      className={cn(
        'relative select-none transition-all duration-200 active:scale-[0.98]',
        isCompleted && 'opacity-50',
        overdue && !isCompleted && 'border-red-200 bg-red-50/50',
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        {assignedUser ? (
          <UserAvatar
            displayName={assignedUser.display_name}
            colorHex={assignedUser.color_hex}
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
            ?
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showTypeBadge && (
              <span className="shrink-0 text-xs" title={t('chores.householdBadge')}>
                <Home className="h-3.5 w-3.5 text-blue-500" />
              </span>
            )}
            <p
              className={cn(
                'truncate text-sm font-medium',
                isCompleted && 'line-through',
              )}
            >
              {instance.chore.title}
            </p>
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {frequencyLabel}
            </span>
            {instance.due_at && (
              <span className={cn('flex items-center gap-0.5', overdue && 'text-red-500')}>
                {overdue ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {formatRelative(instance.due_at)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {isUnassigned && onClaim && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClaim(instance.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary active:scale-95"
            >
              <Hand className="h-3.5 w-3.5" />
              {t('chores.action.claim')}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActionsOpen(instance);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted active:scale-95"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
