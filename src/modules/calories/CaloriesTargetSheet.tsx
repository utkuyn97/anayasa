/**
 * CaloriesTargetSheet.tsx — Set/update daily calorie & macro targets.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

import type { DailyTarget } from './calories.types';
import { upsertDailyTarget } from './calories.api';

interface CaloriesTargetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTarget: DailyTarget | null;
  onUpdated: () => void;
}

export default function CaloriesTargetSheet({
  open,
  onOpenChange,
  currentTarget,
  onUpdated,
}: CaloriesTargetSheetProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('70');

  useEffect(() => {
    if (currentTarget) {
      setCalories(String(currentTarget.target_calories));
      setProtein(String(currentTarget.target_protein_g));
      setCarbs(String(currentTarget.target_carbs_g));
      setFat(String(currentTarget.target_fat_g));
    }
  }, [currentTarget]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await upsertDailyTarget({
        target_calories: parseInt(calories) || 2000,
        target_protein_g: parseInt(protein) || 150,
        target_carbs_g: parseInt(carbs) || 200,
        target_fat_g: parseInt(fat) || 70,
      });
      toast({ title: t('calories.toast.targetSaved') });
      onOpenChange(false);
      onUpdated();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('calories.target.title')}</SheetTitle>
          <SheetDescription>{t('calories.target.description')}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label htmlFor="target-cal">
              {t('calories.macro.calories')} (kcal)
            </Label>
            <Input
              id="target-cal"
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-protein">
              {t('calories.macro.protein')} (g)
            </Label>
            <Input
              id="target-protein"
              type="number"
              min="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-carbs">
              {t('calories.macro.carbs')} (g)
            </Label>
            <Input
              id="target-carbs"
              type="number"
              min="0"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-fat">
              {t('calories.macro.fat')} (g)
            </Label>
            <Input
              id="target-fat"
              type="number"
              min="0"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('common.save')
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
