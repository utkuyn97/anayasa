/**
 * MealPlanFormSheet.tsx — Add a meal to a day's plan.
 * Fields: meal type, food name, calories, protein, carbs, fat.
 */
import { useState } from 'react';
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

import type { MealType } from './calories.types';
import { createMealPlan } from './calories.api';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealPlanFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onCreated: () => void;
}

export default function MealPlanFormSheet({
  open,
  onOpenChange,
  date,
  onCreated,
}: MealPlanFormSheetProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [amountG, setAmountG] = useState('');

  function reset() {
    setMealType('lunch');
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setAmountG('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!foodName.trim()) return;

    try {
      setSaving(true);
      await createMealPlan(date, {
        meal_type: mealType,
        food_name: foodName.trim(),
        amount_g: amountG ? parseFloat(amountG) : null,
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      });
      toast({ title: t('calories.toast.added') });
      reset();
      onOpenChange(false);
      onCreated();
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
          <SheetTitle>{t('calories.form.title')}</SheetTitle>
          <SheetDescription>{t('calories.form.description')}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
          {/* Meal Type */}
          <div className="space-y-2">
            <Label>{t('calories.field.mealType')}</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setMealType(mt)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    mealType === mt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {t(`calories.mealType.${mt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Food Name */}
          <div className="space-y-2">
            <Label htmlFor="food-name">{t('calories.field.foodName')}</Label>
            <Input
              id="food-name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder={t('calories.field.foodNamePlaceholder')}
            />
          </div>

          {/* Amount (g) — optional */}
          <div className="space-y-2">
            <Label htmlFor="amount-g">{t('calories.field.amountG')}</Label>
            <Input
              id="amount-g"
              type="number"
              min="0"
              value={amountG}
              onChange={(e) => setAmountG(e.target.value)}
              placeholder={t('calories.field.amountGPlaceholder')}
              inputMode="numeric"
            />
          </div>

          {/* Macros grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cal-kcal" className="text-xs">
                {t('calories.macro.calories')} (kcal)
              </Label>
              <Input
                id="cal-kcal"
                type="number"
                min="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cal-protein" className="text-xs">
                {t('calories.macro.protein')} (g)
              </Label>
              <Input
                id="cal-protein"
                type="number"
                min="0"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cal-carbs" className="text-xs">
                {t('calories.macro.carbs')} (g)
              </Label>
              <Input
                id="cal-carbs"
                type="number"
                min="0"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cal-fat" className="text-xs">
                {t('calories.macro.fat')} (g)
              </Label>
              <Input
                id="cal-fat"
                type="number"
                min="0"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !foodName.trim()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('calories.form.submit')
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
