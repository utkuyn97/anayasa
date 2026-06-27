/**
 * MyTasksView.tsx — "Görevlerim" unified view.
 *
 * Shows: bana atanmış chore_instances + kendi personal_tasks
 * Sorted by due_at ascending. Badge: 🏠 (chore) / 👤 (personal)
 * Atanmamış chore'lar GELMEZ (D-0017).
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PartyPopper } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import ChoreCard from './ChoreCard';
import ChoreActionsSheet from './ChoreActionsSheet';
import ReassignDialog from './ReassignDialog';
import PersonalTaskCard from '../personal-tasks/PersonalTaskCard';
import { mergeMyTasks, calculateWeeklyCompletionRate } from './chores.helpers';
import {
  completeInstance,
  skipInstance,
  reassignInstance,
  reassignChore,
  deleteChore,
  deleteInstance,
  updateChore,
  materializeAllChores,
} from './chores.api';
import { completePersonalTask } from '../personal-tasks/personalTasks.api';
import { toast } from '@/components/ui/toast';
import ChoreFormDialog from './ChoreFormDialog';
import type { Chore, ChoreInstanceWithChore, ChoreFormData } from './chores.types';
import type { PersonalTask } from '../personal-tasks/personalTasks.types';

export default function MyTasksView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [materialized, setMaterialized] = useState(false);

  // Lazy materialize on first load
  useEffect(() => {
    if (!materialized) {
      materializeAllChores(14)
        .then(() => setMaterialized(true))
        .catch(() => setMaterialized(true));
    }
  }, [materialized]);

  // Chore instances assigned to me (realtime)
  const {
    rows: allInstances,
    isLoading: instancesLoading,
    refetch: refetchInstances,
  } = useRealtimeRows<ChoreInstanceWithChore>({
    table: 'chore_instances',
    select: '*, chore:chores!chore_id(title, description, frequency_type, frequency_value, deadline_hours)',
    orderBy: { column: 'due_at', ascending: true },
    realtime: true,
  });

  // Personal tasks (no realtime needed per D-0010)
  const {
    rows: personalTasks,
    isLoading: personalLoading,
    refetch: refetchPersonal,
  } = useRealtimeRows<PersonalTask>({
    table: 'personal_tasks',
    realtime: false,
  });

  // Filter: only my assigned instances (pending/overdue)
  // For recurring chores: only show the nearest pending instance per chore
  const myInstances = useMemo(() => {
    const mine = allInstances.filter(
      (i) =>
        i.assigned_to === user?.id &&
        (i.status === 'pending' || i.status === 'overdue'),
    );

    // Group by chore_id, keep only the earliest due instance per chore
    const nearest = new Map<string, typeof mine[0]>();
    for (const inst of mine) {
      const choreId = inst.chore_id;
      const existing = nearest.get(choreId);
      if (!existing || new Date(inst.due_at) < new Date(existing.due_at)) {
        nearest.set(choreId, inst);
      }
    }
    return Array.from(nearest.values());
  }, [allInstances, user?.id]);

  const myPendingPersonal = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return personalTasks.filter((pt) => {
      if (pt.completed_at) return false;
      // Hide future daily recurring tasks (they'll appear on their due date)
      if (pt.recurrence === 'daily' && pt.due_at && new Date(pt.due_at) > endOfToday) {
        return false;
      }
      return true;
    });
  }, [personalTasks]);

  // Merged task list
  const mergedTasks = useMemo(
    () => mergeMyTasks(myInstances, myPendingPersonal),
    [myInstances, myPendingPersonal],
  );

  // Weekly completion rate
  const completionRate = useMemo(() => {
    const allMyInstances = allInstances.filter((i) => i.assigned_to === user?.id);
    return calculateWeeklyCompletionRate(allMyInstances);
  }, [allInstances, user?.id]);

  // Action sheet state
  const [actionsInstance, setActionsInstance] = useState<ChoreInstanceWithChore | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<'instance' | 'chore'>('instance');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ChoreInstanceWithChore | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Pick<Chore, 'id' | 'title' | 'description' | 'frequency_type' | 'frequency_value' | 'deadline_hours' | 'assigned_to'> | null>(null);

  // Handlers
  const handleComplete = useCallback(async (id: string) => {
    try {
      await completeInstance(id);
      toast({
        title: t('chores.toast.completed'),
        variant: 'success',
        duration: 3000,
      });
      // Undo ability — simplified (full undo would need timer)
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetchInstances();
  }, [t, refetchInstances]);

  const handleSkip = useCallback(async (id: string) => {
    try {
      await skipInstance(id);
      toast({ title: t('chores.toast.skipped'), variant: 'info' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetchInstances();
  }, [t, refetchInstances]);

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
    refetchInstances();
  }, [reassignTarget, reassignMode, t, refetchInstances]);

  const handleDelete = useCallback(async (choreId: string) => {
    try {
      await deleteChore(choreId);
      toast({ title: t('chores.toast.deleted'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetchInstances();
  }, [t, refetchInstances]);

  const handleDeleteInstance = useCallback(async (instanceId: string) => {
    try {
      await deleteInstance(instanceId);
      toast({ title: t('chores.toast.instanceDeleted'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetchInstances();
  }, [t, refetchInstances]);

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
    setEditFormOpen(true);
  }, []);

  const handleEditSubmit = useCallback(async (data: ChoreFormData) => {
    if (!editingChore) return;
    try {
      await updateChore(editingChore.id, data);
      toast({ title: t('chores.toast.updated'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    setEditingChore(null);
    refetchInstances();
  }, [editingChore, t, refetchInstances]);

  const handlePersonalComplete = useCallback(async (id: string) => {
    try {
      await completePersonalTask(id);
      toast({ title: t('personalTasks.toast.completed'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
    refetchPersonal();
  }, [t, refetchPersonal]);

  const isLoading = instancesLoading || personalLoading;

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
      {/* Completion rate card */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('chores.completionRate.label')}
            </p>
            <p className="text-2xl font-bold">{completionRate}%</p>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 flex items-center justify-center">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${completionRate}%, transparent ${completionRate}%)`,
              }}
            >
              <div className="h-7 w-7 rounded-full bg-card" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task list */}
      {mergedTasks.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-8 w-8 text-green-500" />}
          title={t('chores.empty.myTasks')}
          description={t('chores.empty.myTasksDesc')}
        />
      ) : (
        <div className="space-y-2">
          {mergedTasks.map((task) => {
            if (task.type === 'chore') {
              // Find the full instance
              const inst = myInstances.find((i) => i.id === task.id);
              if (!inst) return null;
              return (
                <ChoreCard
                  key={task.id}
                  instance={inst}
                  onActionsOpen={(i) => {
                    setActionsInstance(i);
                    setActionsOpen(true);
                  }}
                  showTypeBadge
                />
              );
            }
            // Personal task
            const pt = myPendingPersonal.find((p) => p.id === task.id);
            if (!pt) return null;
            return (
              <PersonalTaskCard
                key={task.id}
                task={pt}
                onComplete={handlePersonalComplete}
                showTypeBadge
              />
            );
          })}
        </div>
      )}

      {/* Action Sheets */}
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

      <ChoreFormDialog
        open={editFormOpen}
        onOpenChange={(open) => {
          setEditFormOpen(open);
          if (!open) setEditingChore(null);
        }}
        onSubmit={handleEditSubmit}
        editChore={editingChore}
      />

      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        mode={reassignMode}
        title={reassignTarget?.chore.title ?? ''}
        onConfirm={handleReassignConfirm}
      />
    </div>
  );
}
