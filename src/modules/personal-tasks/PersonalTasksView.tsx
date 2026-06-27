/**
 * PersonalTasksView.tsx — "Kişisel" tab view.
 *
 * Shows only current user's personal tasks.
 * Filters: Açık | Tamamlanan | Tüm
 * Sort: priority, then due_at.
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import EmptyState from '@/components/EmptyState';
import PersonalTaskCard from './PersonalTaskCard';
import PersonalTaskFormDialog from './PersonalTaskFormDialog';
import {
  createPersonalTask,
  completePersonalTask,
  uncompletePersonalTask,
  deletePersonalTask,
} from './personalTasks.api';
import { toast } from '@/components/ui/toast';
import type { PersonalTask, PersonalTaskFilter, PersonalTaskFormData } from './personalTasks.types';

const filterOptions: PersonalTaskFilter[] = ['open', 'completed', 'all'];

const priorityOrder: Record<string, number> = { high: 0, med: 1, low: 2 };

export default function PersonalTasksView() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<PersonalTaskFilter>('open');
  const [formOpen, setFormOpen] = useState(false);

  // Fetch personal tasks (no realtime per D-0010)
  const {
    rows: tasks,
    isLoading,
    refetch,
  } = useRealtimeRows<PersonalTask>({
    table: 'personal_tasks',
    realtime: false,
  });

  // Filter
  const filteredTasks = useMemo(() => {
    let filtered: PersonalTask[];
    switch (activeFilter) {
      case 'open':
        filtered = tasks.filter((t) => !t.completed_at);
        break;
      case 'completed':
        filtered = tasks.filter((t) => !!t.completed_at);
        break;
      default:
        filtered = tasks;
    }

    // Sort: priority desc, then due_at asc
    return [...filtered].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;

      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
  }, [tasks, activeFilter]);

  // Handlers
  const handleCreate = useCallback(async (data: PersonalTaskFormData) => {
    try {
      await createPersonalTask(data);
      toast({ title: t('personalTasks.toast.created'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  const handleComplete = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    try {
      if (task?.completed_at) {
        await uncompletePersonalTask(id);
      } else {
        await completePersonalTask(id);
        toast({ title: t('personalTasks.toast.completed'), variant: 'success' });
      }
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [tasks, t, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deletePersonalTask(id);
      toast({ title: t('personalTasks.toast.deleted'), variant: 'info' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('tasks.personal')}</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t('personalTasks.form.addButton')}
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {t(`personalTasks.filter.${filter}`)}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-8 w-8 text-purple-400" />}
          title={t('personalTasks.empty.title')}
          description={t('personalTasks.empty.description')}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <PersonalTaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PersonalTaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
