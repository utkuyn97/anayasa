/**
 * SmokingPage.tsx — Smoking Quit module.
 *
 * Features:
 * - Onboarding form if no setup exists
 * - Big counter: X days, Y hours, Z minutes, S seconds (live)
 * - Savings card (€)
 * - Milestone grid (7 milestones, achieved ones ✅)
 * - "I smoked" button (red, two-tap confirm)
 * - Owner-only: partner cannot see (RLS + UI guard)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Cigarette, Euro, Award, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import EmptyState from '@/components/EmptyState';
import {
  getSetup,
  saveSetup,
  listRelapses,
  addRelapse,
  getMilestones,
  achieveMilestone,
} from './smoking.api';
import { MILESTONES, checkMilestones } from './smoking.helpers';
import { useSmokingTimer } from './useSmokingTimer';
import type {
  SmokingQuit,
  SmokingRelapse,
  SmokingMilestone,
  MilestoneKey,
} from './smoking.types';

export default function SmokingPage() {
  const { t } = useTranslation();
  const { userInfo } = useAuth();

  const [setup, setSetup] = useState<SmokingQuit | null>(null);
  const [relapses, setRelapses] = useState<SmokingRelapse[]>([]);
  const [milestoneRecords, setMilestoneRecords] = useState<SmokingMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [relapseConfirm, setRelapseConfirm] = useState(false);

  // Setup form state
  const [quitDate, setQuitDate] = useState('');
  const [cigsPerDay, setCigsPerDay] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [packSize, setPackSize] = useState('20');
  const [savingSetup, setSavingSetup] = useState(false);

  // Owner guard — only owner can access smoking module
  const isOwner = userInfo?.role === 'owner';

  const fetchAll = useCallback(async () => {
    try {
      const [s, r, m] = await Promise.all([
        getSetup(),
        listRelapses(),
        getMilestones(),
      ]);
      setSetup(s);
      setRelapses(r);
      setMilestoneRecords(m);
      if (!s) setShowSetupForm(true);
    } catch {
      // personal module — silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) fetchAll();
    else setIsLoading(false);
  }, [fetchAll, isOwner]);

  const lastRelapseAt = relapses.length > 0 ? relapses[0].occurred_at : null;

  const timer = useSmokingTimer(
    setup?.quit_date ?? null,
    lastRelapseAt,
    setup?.cigarettes_per_day_before ?? 0,
    Number(setup?.price_per_pack_eur ?? 0),
    setup?.cigarettes_per_pack ?? 20,
  );

  // Check and auto-achieve new milestones
  const achievedKeys = useMemo(
    () => new Set(milestoneRecords.map((m) => m.milestone_key as MilestoneKey)),
    [milestoneRecords],
  );

  useEffect(() => {
    if (!setup || timer.durationMs === 0) return;

    const newlyAchieved = checkMilestones(timer.durationMs, achievedKeys);
    for (const key of newlyAchieved) {
      achieveMilestone(key).then(() => {
        toast({
          title: t('smoking.toast.milestoneAchieved', {
            milestone: t(`smoking.milestone.${key}`),
          }),
          variant: 'success',
        });
        fetchAll();
      });
    }
  }, [timer.durationMs, achievedKeys, setup, t, fetchAll]);

  const handleSaveSetup = async () => {
    const perDay = parseInt(cigsPerDay, 10);
    const price = parseFloat(packPrice);
    const size = parseInt(packSize, 10);
    if (!quitDate || !perDay || !price || !size) return;

    setSavingSetup(true);
    try {
      await saveSetup({
        quit_date: new Date(quitDate).toISOString(),
        cigarettes_per_day_before: perDay,
        price_per_pack_eur: price,
        cigarettes_per_pack: size,
      });
      toast({ title: t('smoking.toast.setupSaved'), variant: 'success' });
      setShowSetupForm(false);
      fetchAll();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setSavingSetup(false);
    }
  };

  const handleRelapse = async () => {
    if (!relapseConfirm) {
      setRelapseConfirm(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setRelapseConfirm(false), 3000);
      return;
    }
    try {
      await addRelapse();
      toast({ title: t('smoking.toast.relapseRecorded'), variant: 'info' });
      setRelapseConfirm(false);
      fetchAll();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  };

  // Not owner — show forbidden
  if (!isOwner) {
    return (
      <EmptyState
        icon={<Cigarette className="h-8 w-8 text-muted-foreground" />}
        title={t('smoking.ownerOnly')}
        description={t('smoking.ownerOnlyDesc')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Setup form (onboarding)
  if (showSetupForm || !setup) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">{t('smoking.title')}</h1>
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="text-center">
            <Cigarette className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('smoking.setup.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('smoking.setup.description')}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('smoking.field.quitDate')}</label>
            <input
              type="datetime-local"
              value={quitDate}
              onChange={(e) => setQuitDate(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('smoking.field.cigsPerDay')}</label>
            <input
              type="number"
              value={cigsPerDay}
              onChange={(e) => setCigsPerDay(e.target.value)}
              placeholder="20"
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('smoking.field.packPrice')}</label>
              <input
                type="number"
                step="0.01"
                value={packPrice}
                onChange={(e) => setPackPrice(e.target.value)}
                placeholder="8.50"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('smoking.field.packSize')}</label>
              <input
                type="number"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="20"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSetup}
            disabled={!quitDate || !cigsPerDay || !packPrice || savingSetup}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {savingSetup ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              t('smoking.setup.submit')
            )}
          </button>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('smoking.title')}</h1>

      {/* Big counter */}
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('smoking.smokeFree')}
        </p>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold tabular-nums">{timer.days}</span>
          <span className="text-sm text-muted-foreground">{t('smoking.unit.days')}</span>
          <span className="text-2xl font-bold tabular-nums ml-2">{timer.hours}</span>
          <span className="text-xs text-muted-foreground">{t('smoking.unit.hours')}</span>
          <span className="text-2xl font-bold tabular-nums ml-2">
            {String(timer.minutes).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">{t('smoking.unit.min')}</span>
          <span className="text-lg font-semibold tabular-nums ml-2 text-muted-foreground">
            {String(timer.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-muted-foreground">{t('smoking.unit.sec')}</span>
        </div>
      </div>

      {/* Savings card */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
            <Euro className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('smoking.savings')}</p>
            <p className="text-xl font-bold text-green-700">
              {formatCurrency(timer.savings)}
            </p>
          </div>
        </div>
      </div>

      {/* Milestones grid */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('smoking.milestones')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {MILESTONES.map((milestone) => {
            const achieved = achievedKeys.has(milestone.key);
            const progress = Math.min(
              1,
              timer.durationMs / milestone.durationMs,
            );
            return (
              <div
                key={milestone.key}
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  achieved
                    ? 'border-green-200 bg-green-50'
                    : 'bg-card',
                )}
              >
                <div className="flex items-center gap-2">
                  <Award
                    className={cn(
                      'h-4 w-4',
                      achieved ? 'text-green-600' : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-xs font-semibold">
                    {t(milestone.labelKey)}
                  </span>
                  {achieved && <span className="text-xs">✅</span>}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t(milestone.descriptionKey)}
                </p>
                {!achieved && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Relapse button */}
      <div className="pt-4">
        <button
          onClick={handleRelapse}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
            relapseConfirm
              ? 'bg-red-600 text-white'
              : 'border-2 border-red-200 text-red-600 hover:bg-red-50',
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {relapseConfirm
              ? t('smoking.relapseConfirm')
              : t('smoking.relapseButton')}
          </span>
        </button>
        {relapseConfirm && (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {t('smoking.relapseHint')}
          </p>
        )}
      </div>
    </div>
  );
}
