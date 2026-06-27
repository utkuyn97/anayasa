/**
 * PersonalTaskCard.tsx — Card for a single personal task.
 *
 * Features:
 * - Checkbox for completion
 * - Title, due_at, priority badge, tag chips
 * - Type badge (👤) when in unified view
 */
import { useTranslation } from 'react-i18next';
import { User, Calendar, Trash2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';
import { Card } from '@/components/ui/card';
import type { PersonalTask } from './personalTasks.types';

interface PersonalTaskCardProps {
  task: PersonalTask;
  onComplete: (id: string) => void;
  onDelete?: (id: string) => void;
  showTypeBadge?: boolean;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  med: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function PersonalTaskCard({
  task,
  onComplete,
  onDelete,
  showTypeBadge = false,
}: PersonalTaskCardProps) {
  const { t } = useTranslation();
  const isCompleted = !!task.completed_at;

  return (
    <Card
      className={cn(
        'transition-all duration-200 active:scale-[0.98]',
        isCompleted && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={() => onComplete(task.id)}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
            isCompleted
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-muted-foreground/30 hover:border-primary',
          )}
        >
          {isCompleted && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showTypeBadge && (
              <span className="shrink-0 text-xs" title={t('personalTasks.badge')}>
                <User className="h-3.5 w-3.5 text-purple-500" />
              </span>
            )}
            <p
              className={cn(
                'truncate text-sm font-medium',
                isCompleted && 'line-through',
              )}
            >
              {task.title}
            </p>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            {/* Priority badge */}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                priorityColors[task.priority],
              )}
            >
              {t(`personalTasks.priority.${task.priority}`)}
            </span>

            {/* Recurrence badge */}
            {task.recurrence && (
              <span className="flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                <Repeat className="h-2.5 w-2.5" />
                {t(`personalTasks.recurrence.${task.recurrence}`)}
              </span>
            )}

            {/* Due date */}
            {task.due_at && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatRelative(task.due_at)}
              </span>
            )}

            {/* Tags */}
            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Delete */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
