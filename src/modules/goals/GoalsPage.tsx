/**
 * GoalsPage.tsx — Goals & Dreams module main page.
 *
 * Features:
 * - Status tabs: All / Dreaming / Planned / Active / Achieved
 * - Pinterest-style 2-column grid with images
 * - "+" button for new goal (with photo upload)
 * - Realtime sync for shared goals
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Target, ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import EmptyState from '@/components/EmptyState';
import { getGoalImageUrl } from './goals.api';
import type { Goal, GoalStatus } from './goals.types';
import GoalFormDialog from './GoalFormDialog';
import GoalDetailDialog from './GoalDetailDialog';

const STATUS_TABS: Array<GoalStatus | 'all'> = [
  'all',
  'dreaming',
  'planned',
  'in_progress',
  'achieved',
];

export default function GoalsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GoalStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const { rows: goals, isLoading, refetch } = useRealtimeRows<Goal>({
    table: 'goals',
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    realtime: true,
  });

  // Filter by status tab
  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter((g) => g.status === activeTab);
  }, [goals, activeTab]);

  // Load signed URLs for images
  const loadImageUrls = useCallback(async () => {
    const urls: Record<string, string> = {};
    for (const goal of goals) {
      if (goal.image_path && !imageUrls[goal.id]) {
        try {
          const url = await getGoalImageUrl(goal.image_path);
          if (url) urls[goal.id] = url;
        } catch {
          // Skip failed URLs
        }
      }
    }
    if (Object.keys(urls).length > 0) {
      setImageUrls((prev) => ({ ...prev, ...urls }));
    }
  }, [goals, imageUrls]);

  useEffect(() => {
    loadImageUrls();
  }, [goals.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoalCreated = () => {
    refetch();
    setFormOpen(false);
  };

  const handleGoalUpdated = () => {
    refetch();
    setSelectedGoal(null);
  };

  const getStatusIcon = (status: GoalStatus) => {
    switch (status) {
      case 'dreaming': return '💭';
      case 'planned': return '📋';
      case 'in_progress': return '🚀';
      case 'achieved': return '🏆';
      case 'paused': return '⏸️';
      default: return '💭';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('goals.title')}</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t(`goals.status.${tab}`)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8 text-muted-foreground" />}
          title={t('goals.empty.title')}
          description={t('goals.empty.description')}
        />
      ) : (
        /* Pinterest Grid */
        <div className="grid grid-cols-2 gap-3">
          {filteredGoals.map((goal) => {
            const imgUrl = imageUrls[goal.id];
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-shadow hover:shadow-md"
              >
                {/* Image area */}
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={goal.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Status badge */}
                  <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs backdrop-blur-sm">
                    {getStatusIcon(goal.status)}
                  </span>
                </div>
                {/* Content */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                    {goal.title}
                  </h3>
                  {goal.category && goal.category !== 'genel' && (
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {goal.category}
                    </span>
                  )}
                  {goal.target_date && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {goal.target_date}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleGoalCreated}
      />

      {/* Detail dialog */}
      {selectedGoal && (
        <GoalDetailDialog
          goal={selectedGoal}
          imageUrl={imageUrls[selectedGoal.id] ?? null}
          open={!!selectedGoal}
          onOpenChange={(open) => { if (!open) setSelectedGoal(null); }}
          onUpdated={handleGoalUpdated}
        />
      )}
    </div>
  );
}
