/**
 * BodyPage.tsx — Body & weight tracking module.
 *
 * Features:
 * - Latest measurement big card with delta
 * - Trend chart (recharts) with 30/90/180/365 day toggle
 * - Add measurement form (modal)
 * - Personal: partner cannot see (RLS)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, TrendingDown, TrendingUp, Minus, Scale } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { listMeasurements } from './body.api';
import type { BodyMeasurement } from './body.types';
import BodyFormDialog from './BodyFormDialog';

const RANGE_OPTIONS = [30, 90, 180, 365] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

export default function BodyPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? enUS : tr;

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<RangeOption>(30);
  const [formOpen, setFormOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await listMeasurements(range);
      setMeasurements(data);
    } catch {
      // Error handled silently — personal module
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Latest measurement
  const latest = measurements[0] ?? null;

  // Delta from previous measurement
  const delta = useMemo(() => {
    if (measurements.length < 2) return null;
    return Number((measurements[0].weight_kg - measurements[1].weight_kg).toFixed(1));
  }, [measurements]);

  // Chart data (reversed for chronological order)
  const chartData = useMemo(() => {
    return [...measurements]
      .reverse()
      .map((m) => ({
        date: format(parseISO(m.measured_at), 'd MMM', { locale }),
        weight: Number(m.weight_kg),
        fat: m.body_fat_pct ? Number(m.body_fat_pct) : undefined,
      }));
  }, [measurements, locale]);

  const handleSuccess = () => {
    setFormOpen(false);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{t('body.title')}</h1>
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
        <h1 className="text-xl font-bold">{t('body.title')}</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {measurements.length === 0 ? (
        <EmptyState
          icon={<Scale className="h-8 w-8 text-muted-foreground" />}
          title={t('body.empty.title')}
          description={t('body.empty.description')}
        />
      ) : (
        <>
          {/* Latest measurement card */}
          {latest && (
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('body.latestMeasurement')}
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">
                    {Number(latest.weight_kg).toFixed(1)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">kg</span>
                  </p>
                </div>
                {delta !== null && (
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                      delta < 0
                        ? 'bg-green-100 text-green-700'
                        : delta > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {delta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : delta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {delta > 0 ? '+' : ''}{delta} kg
                  </div>
                )}
              </div>

              {/* Optional measurements */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {latest.body_fat_pct != null && (
                  <span>
                    {t('body.field.bodyFat')}: {Number(latest.body_fat_pct).toFixed(1)}%
                  </span>
                )}
                {latest.waist_cm != null && (
                  <span>
                    {t('body.field.waist')}: {Number(latest.waist_cm)} cm
                  </span>
                )}
                {latest.chest_cm != null && (
                  <span>
                    {t('body.field.chest')}: {Number(latest.chest_cm)} cm
                  </span>
                )}
                {latest.arm_cm != null && (
                  <span>
                    {t('body.field.arm')}: {Number(latest.arm_cm)} cm
                  </span>
                )}
                {latest.hip_cm != null && (
                  <span>
                    {t('body.field.hip')}: {Number(latest.hip_cm)} cm
                  </span>
                )}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground/60">
                {format(parseISO(latest.measured_at), 'd MMMM yyyy', { locale })}
              </p>
            </div>
          )}

          {/* Range toggle */}
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  range === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {t(`body.range.${r}`)}
              </button>
            ))}
          </div>

          {/* Trend chart */}
          {chartData.length >= 2 && (
            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">
                {t('body.trendChart')}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={t('body.field.weight')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Measurement history */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t('body.history')}
            </h3>
            {measurements.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border bg-card px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {Number(m.weight_kg).toFixed(1)} kg
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(parseISO(m.measured_at), 'd MMM yyyy', { locale })}
                    </p>
                  </div>
                  {m.note && (
                    <p className="max-w-[120px] truncate text-xs text-muted-foreground">
                      {m.note}
                    </p>
                  )}
                </div>
                {/* Detail metrics */}
                {(m.body_fat_pct != null || m.waist_cm != null || m.chest_cm != null || m.arm_cm != null || m.hip_cm != null) && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {m.body_fat_pct != null && <span>🔹 {t('body.field.bodyFat')}: {Number(m.body_fat_pct).toFixed(1)}%</span>}
                    {m.waist_cm != null && <span>🔹 {t('body.field.waist')}: {Number(m.waist_cm)} cm</span>}
                    {m.chest_cm != null && <span>🔹 {t('body.field.chest')}: {Number(m.chest_cm)} cm</span>}
                    {m.arm_cm != null && <span>🔹 {t('body.field.arm')}: {Number(m.arm_cm)} cm</span>}
                    {m.hip_cm != null && <span>🔹 {t('body.field.hip')}: {Number(m.hip_cm)} cm</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form dialog */}
      <BodyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
