/**
 * FinanceCategorySheet.tsx — CRUD for expense categories.
 * Each category has: name, monthly limit, color, icon, scope.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2 } from 'lucide-react';

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

import type { ExpenseCategory, ExpenseCategoryFormData } from './finance.types';
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from './finance.api';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

interface FinanceCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function FinanceCategorySheet({
  open,
  onOpenChange,
  onUpdated,
}: FinanceCategorySheetProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ExpenseCategoryFormData>({
    name: '',
    monthly_limit_eur: 0,
    scope: 'shared',
    color_hex: '#3b82f6',
    icon: 'circle',
  });

  const fetchCategories = useCallback(async () => {
    const data = await listExpenseCategories();
    setCategories(data);
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
      setShowForm(false);
    }
  }, [open, fetchCategories]);

  function openForm(cat?: ExpenseCategory) {
    if (cat) {
      setEditingId(cat.id);
      setForm({
        name: cat.name,
        monthly_limit_eur: Number(cat.monthly_limit_eur),
        scope: cat.scope,
        color_hex: cat.color_hex,
        icon: cat.icon,
      });
    } else {
      setEditingId(null);
      setForm({
        name: '',
        monthly_limit_eur: 0,
        scope: 'shared',
        color_hex: '#3b82f6',
        icon: 'circle',
      });
    }
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateExpenseCategory(editingId, form);
        toast({ title: t('finance.toast.categoryUpdated') });
      } else {
        await createExpenseCategory(form);
        toast({ title: t('finance.toast.categoryAdded') });
      }
      setShowForm(false);
      await fetchCategories();
      onUpdated();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpenseCategory(id);
      toast({ title: t('finance.toast.categoryDeleted') });
      await fetchCategories();
      onUpdated();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('finance.category.title')}</SheetTitle>
          <SheetDescription>{t('finance.category.description')}</SheetDescription>
        </SheetHeader>

        {!showForm ? (
          <div className="space-y-3 overflow-y-auto p-4">
            <Button
              size="sm"
              onClick={() => openForm()}
              className="w-full"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('finance.category.add')}
            </Button>

            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => openForm(cat)}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: cat.color_hex }}
                  />
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('finance.category.limitLabel')}: €{Number(cat.monthly_limit_eur).toFixed(2)}
                      {cat.scope === 'personal' && ` · ${t('finance.personal')}`}
                    </p>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 overflow-y-auto p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              {t('common.back')}
            </Button>

            <div className="space-y-2">
              <Label>{t('finance.field.name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('finance.field.categoryPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('finance.category.limitLabel')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={form.monthly_limit_eur || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val))
                    setForm((f) => ({ ...f, monthly_limit_eur: parseFloat(val) || 0 }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('finance.field.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color_hex: color }))}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      form.color_hex === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('finance.field.scope')}</Label>
              <div className="flex gap-2">
                {(['shared', 'personal'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scope }))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      form.scope === scope
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t(`finance.scope.${scope}`)}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.save')
              )}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
