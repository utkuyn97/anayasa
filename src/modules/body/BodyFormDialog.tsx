/**
 * BodyFormDialog.tsx — Add a new body measurement.
 *
 * Weight is required. All other fields are optional.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { createMeasurement } from './body.api';

interface BodyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BodyFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: BodyFormDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [measuredAt, setMeasuredAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [hip, setHip] = useState('');
  const [note, setNote] = useState('');

  const resetForm = () => {
    setMeasuredAt(format(new Date(), 'yyyy-MM-dd'));
    setWeightKg('');
    setBodyFat('');
    setWaist('');
    setChest('');
    setArm('');
    setHip('');
    setNote('');
  };

  const handleSubmit = async () => {
    const weight = parseFloat(weightKg);
    if (!weight || weight <= 0) return;

    setLoading(true);
    try {
      await createMeasurement({
        measured_at: measuredAt,
        weight_kg: weight,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        waist_cm: waist ? parseFloat(waist) : null,
        chest_cm: chest ? parseFloat(chest) : null,
        arm_cm: arm ? parseFloat(arm) : null,
        hip_cm: hip ? parseFloat(hip) : null,
        note: note.trim(),
      });
      toast({ title: t('body.toast.added'), variant: 'success' });
      resetForm();
      onSuccess();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('body.form.title')}</SheetTitle>
          <SheetDescription>{t('body.form.description')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('body.field.date')}</label>
            <input
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Weight (required) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('body.field.weight')} (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="75.0"
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Optional fields in 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('body.field.bodyFat')} (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('body.field.waist')} (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('body.field.chest')} (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('body.field.arm')} (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('body.field.hip')} (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={hip}
                onChange={(e) => setHip(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('body.field.note')}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t('common.optional')})
              </span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('body.field.notePlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!weightKg || loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              t('body.form.submit')
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
