/**
 * ChoresHouseholdView.tsx — "Household" tab view.
 *
 * Shows ALL chore_instances (assigned, unassigned, partner's).
 * Filter chips: All | Unassigned | Mine | Partner's | Today | Upcoming
 * + button for new chore. "Claim it" CTA on unassigned cards.
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { isSameDay, isAfter, addDays, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import EmptyState from '@/components/EmptyState';
import ChoreCard from './ChoreCard';
import ChoreActionsSheet from './ChoreActionsSheet';
import ReassignDialog from './ReassignDialog';
import ChoreFormDialog from './ChoreFormDialog';
import {
  createChore,
  completeInstance,
  skipInstance,
  reassignInstance,
  reassignChore,
  claimInstance,
  deleteChore,
  deleteInstance,
  updateChore,
} from './chores.api';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type {
  Chore,
  ChoreInstanceWithChore,
  ChoreFormData,
  HouseholdFilter,
} from './chores.types';

const filterOptions: HouseholdFilter[] = [
  'all',
  'unassigned',
  'mine',
  'partner',
  'today',
  'upcoming',
];

export default function ChoresHouseholdView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getPartner } = useUsers();
  const partnerId = user ? getPartner(user.id)?.id : undefined;

  const [activeFilter, setActiveFilter] = useState<HouseholdFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Pick<Chore, 'id' | 'title' | 'description' | 'frequency_type' | 'frequency_value' | 'deadline_hours' | 'assigned_to'> | null>(null);

  // All instances (realtime)
  const {
    rows: instances,
    isLoading,
    refetch,
  } = useRealtimeRows<ChoreInstanceWithChore>({
    table: 'chore_instances',
    select: '*, chore:chores!chore_id(title, description, frequency_type, frequency_value, deadline_hours)',
    orderBy: { column: 'due_at', ascending: true },
    realtime: true,
  });

  // Only pending/overdue instances
  const activeInstances = useMemo(
    () => instances.filter((i) => i.status === 'pending' || i.status === 'overdue'),
    [instances],
  );

  // Apply filter
  const filteredInstances = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const upcoming = addDays(today, 7);

    switch (activeFilter) {
      case 'unassigned':
        return activeInstances.filter((i) => !i.assigned_to);
      case 'mine':
        return activeInstances.filter((i) => i.assigned_to === user?.id);
      case 'partner':
        return activeInstances.filter((i) => i.assigned_to === partnerId);
      case 'today':
        return activeInstances.filter((i) =>
          isSameDay(new Date(i.due_at), today),
        );
      case 'upcoming':
        return activeInstances.filter((i) => {
          const d = new Date(i.due_at);
          return isAfter(d, today) && !isAfter(d, upcoming);
        });
      default:
        return activeInstances;
    }
  }, [activeInstances, activeFilter, user?.id, partnerId]);

  // Action state
  const [actionsInstance, setActionsInstance] = useState<ChoreInstanceWithChore | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<'instance' | 'chore'>('instance');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ChoreInstanceWithChore | null>(null);

  // Handlers
  const handleComplete = useCallback(async (id: string) => {
    try {
      await completeInstance(id);
      toast({ title: t('chores.toast.completed'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  const handleSkip = useCallback(async (id: string) => {
    try {
      await skipInstance(id);
      toast({ title: t('chores.toast.skipped'), variant: 'info' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  const handleClaim = useCallback(async (id: string) => {
    try {
      await claimInstance(id);
      toast({ title: t('chores.toast.claimed'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  const handleReassignInstance = useCallback((inst: ChoreInstanceWithChore) => {
    setReassignTarget(inst);
    setReassignMode('instance');
    setReassignOpen(true);
  }, []);

  const handleReassignChore = useCallback((inst: ChoreInstanceWithChore) => {
    setReassignTarget(inst);
    setReassignMode('chore');
    setReassignOpen(true);
  }, []);

  const handleReassignConfirm = useCallback(async (newAssignee: string | null) => {
    if (!reassignTarget) return;
    try {
      if (reassignMode === 'instance') {
        await reassignInstance(reassignTarget.id, newAssignee);
      } else {
        await reassignChore(reassignTarget.chore_id, newAssignee);
      }
      toast({ title: t('chores.toast.reassigned'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [reassignTarget, reassignMode, t, refetch]);

  const handleFormSubmit = useCallback(async (data: ChoreFormData) => {
    if (editingChore) {
      try {
        await updateChore(editingChore.id, data);
        toast({ title: t('chores.toast.updated'), variant: 'success' });
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
      setEditingChore(null);
    } else {
      try {
        await createChore(data);
        toast({ title: t('chores.toast.created'), variant: 'success' });
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    }
    refetch();
  }, [editingChore, t, refetch]);

  const handleEdit = useCallback((inst: ChoreInstanceWithChore) => {
    setEditingChore({
      id: inst.chore_id,
      title: inst.chore.title,
      description: inst.chore.description,
      frequency_type: inst.chore.frequency_type,
      frequency_value: inst.chore.frequency_value,
      deadline_hours: inst.chore.deadline_hours,
      assigned_to: inst.assigned_to,
    });
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (choreId: string) => {
    try {
      await deleteChore(choreId);
      toast({ title: t('chores.toast.deleted'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetch();
  }, [t, refetch]);

  const handleDeleteInstance = useCallback(async (instanceId: string) => {
    try {
      await deleteInstance(instanceId);
      toast({ title: t('chores.toast.instanceDeleted'), variant: 'success' });
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
      {/* Header with + button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('tasks.household')}</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t('chores.form.addButton')}
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {t(`chores.filter.${filter}`)}
          </button>
        ))}
      </div>

      {/* Instance list */}
      {filteredInstances.length === 0 ? (
        <EmptyState
          title={t('chores.empty.household')}
          description={t('chores.empty.householdDesc')}
        />
      ) : (
        <div className="space-y-2">
          {filteredInstances.map((inst) => (
            <ChoreCard
              key={inst.id}
              instance={inst}
              onActionsOpen={(i) => {
                setActionsInstance(i);
                setActionsOpen(true);
              }}
              onClaim={!inst.assigned_to ? handleClaim : undefined}
            />
          ))}
        </div>
      )}

      {/* Sheets */}
      <ChoreActionsSheet
        instance={actionsInstance}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        onComplete={handleComplete}
        onReassignInstance={handleReassignInstance}
        onReassignChore={handleReassignChore}
        onSkip={handleSkip}
        onDelete={handleDelete}
        onDeleteInstance={handleDeleteInstance}
        onEdit={handleEdit}
      />

      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        mode={reassignMode}
        title={reassignTarget?.chore.title ?? ''}
        onConfirm={handleReassignConfirm}
      />

      <ChoreFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingChore(null);
        }}
        onSubmit={handleFormSubmit}
        editChore={editingChore}
      />
    </div>
  );
}
