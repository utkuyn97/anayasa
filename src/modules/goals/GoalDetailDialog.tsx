/**
 * GoalDetailDialog.tsx — Goal detail view with milestones, edit, and achieve.
 *
 * Features:
 * - Full-size image
 * - Title, description, category, target date
 * - Milestones list + add
 * - "We did it!" button → achieved + confetti
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Plus,
  Check,
  Circle,
  Trophy,
  Calendar,
  Tag,
  Users,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import {
  achieveGoal,
  listMilestones,
  addMilestone,
  completeMilestone,
} from './goals.api';
import type { Goal, GoalMilestone } from './goals.types';

interface GoalDetailDialogProps {
  goal: Goal;
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function GoalDetailDialog({
  goal,
  imageUrl,
  open,
  onOpenChange,
  onUpdated,
}: GoalDetailDialogProps) {
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [loadingMilestones, setLoadingMilestones] = useState(true);
  const [achieving, setAchieving] = useState(false);
  const [addingMilestone, setAddingMilestone] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const data = await listMilestones(goal.id);
      setMilestones(data);
    } catch {
      // silent
    } finally {
      setLoadingMilestones(false);
    }
  }, [goal.id]);

  useEffect(() => {
    if (open) {
      setLoadingMilestones(true);
      fetchMilestones();
    }
  }, [open, fetchMilestones]);

  const handleAddMilestone = async () => {
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    try {
      await addMilestone(goal.id, newMilestone.trim(), milestones.length);
      setNewMilestone('');
      fetchMilestones();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleToggleMilestone = async (ms: GoalMilestone) => {
    try {
      await completeMilestone(ms.id, !ms.completed_at);
      fetchMilestones();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  };

  const handleAchieve = async () => {
    setAchieving(true);
    try {
      await achieveGoal(goal.id);

      // 🎉 Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({ title: t('goals.toast.achieved'), variant: 'success' });
      onUpdated();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setAchieving(false);
    }
  };

  const completedCount = milestones.filter((m) => m.completed_at).length;
  const totalMilestones = milestones.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0">
        {/* Image */}
        {imageUrl && (
          <div className="aspect-video w-full bg-muted">
            <img
              src={imageUrl}
              alt={goal.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-4">
          <SheetHeader className="px-0 pt-0">
            <SheetTitle className="text-left text-lg">{goal.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2 text-left">
              {goal.scope === 'shared' ? (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {t('finance.scope.shared')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  {t('finance.scope.personal')}
                </span>
              )}
              {goal.category && goal.category !== 'genel' && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Tag className="h-3 w-3" />
                  {goal.category}
                </span>
              )}
              {goal.target_date && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {goal.target_date}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Description */}
            {goal.description && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {goal.description}
              </p>
            )}

            {/* Milestones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {t('goals.milestones')}
                  {totalMilestones > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {completedCount}/{totalMilestones}
                    </span>
                  )}
                </h3>
              </div>

              {loadingMilestones ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {milestones.map((ms) => (
                    <button
                      key={ms.id}
                      onClick={() => handleToggleMilestone(ms)}
                      className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      {ms.completed_at ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-sm ${
                          ms.completed_at
                            ? 'text-muted-foreground line-through'
                            : 'font-medium'
                        }`}
                      >
                        {ms.title}
                      </span>
                    </button>
                  ))}

                  {/* Add milestone input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMilestone();
                      }}
                      placeholder={t('goals.milestoneAdd')}
                      className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleAddMilestone}
                      disabled={!newMilestone.trim() || addingMilestone}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      {addingMilestone ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Achieve button (only if not already achieved) */}
            {goal.status !== 'achieved' && (
              <button
                onClick={handleAchieve}
                disabled={achieving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
              >
                {achieving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Trophy className="h-5 w-5" />
                    {t('goals.achieveButton')}
                  </>
                )}
              </button>
            )}

            {/* Already achieved */}
            {goal.status === 'achieved' && goal.achieved_at && (
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <Trophy className="mx-auto h-8 w-8 text-green-600" />
                <p className="mt-2 text-sm font-semibold text-green-800">
                  {t('goals.achieved')}
                </p>
                <p className="text-xs text-green-600">
                  {new Date(goal.achieved_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
