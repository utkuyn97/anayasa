/**
 * FinanceSettingsSheet.tsx — Settings panel for Finance module.
 * Manages: Income sources, Fixed expenses, Buffer target/current.
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

import type {
  IncomeSource,
  IncomeSourceFormData,
  FixedExpense,
  FixedExpenseFormData,
  BufferSettings,
} from './finance.types';
import {
  listIncomeSources,
  createIncomeSource,
  deleteIncomeSource,
  updateIncomeSource,
  listFixedExpenses,
  createFixedExpense,
  deleteFixedExpense,
  updateFixedExpense,
  getBufferSettings,
  updateBufferSettings,
} from './finance.api';

type Section = 'menu' | 'income' | 'income-form' | 'fixed' | 'fixed-form' | 'buffer';

interface FinanceSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onOpenCategories: () => void;
}

export default function FinanceSettingsSheet({
  open,
  onOpenChange,
  onUpdated,
  onOpenCategories,
}: FinanceSettingsSheetProps) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('menu');
  const [saving, setSaving] = useState(false);

  // Income
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [incomeForm, setIncomeForm] = useState<IncomeSourceFormData>({
    name: '',
    amount_eur: 0,
    frequency: 'monthly',
    scope: 'shared',
  });
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  // Fixed
  const [fixedList, setFixedList] = useState<FixedExpense[]>([]);
  const [fixedForm, setFixedForm] = useState<FixedExpenseFormData>({
    name: '',
    amount_eur: 0,
    day_of_month: 1,
    category: 'genel',
    scope: 'shared',
  });
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  // Buffer
  const [_buffer, setBuffer] = useState<BufferSettings | null>(null);
  const [bufferTarget, setBufferTarget] = useState('');
  const [bufferCurrent, setBufferCurrent] = useState('');

  const fetchIncomes = useCallback(async () => {
    const data = await listIncomeSources();
    setIncomes(data);
  }, []);

  const fetchFixed = useCallback(async () => {
    const data = await listFixedExpenses();
    setFixedList(data);
  }, []);

  const fetchBuffer = useCallback(async () => {
    const data = await getBufferSettings();
    setBuffer(data);
    setBufferTarget(String(data?.target_amount_eur ?? 0));
    setBufferCurrent(String(data?.current_amount_eur ?? 0));
  }, []);

  useEffect(() => {
    if (open) {
      setSection('menu');
    }
  }, [open]);

  useEffect(() => {
    if (section === 'income') fetchIncomes();
    if (section === 'fixed') fetchFixed();
    if (section === 'buffer') fetchBuffer();
  }, [section, fetchIncomes, fetchFixed, fetchBuffer]);

  // ── Income handlers ──
  function openIncomeForm(income?: IncomeSource) {
    if (income) {
      setEditingIncomeId(income.id);
      setIncomeForm({
        name: income.name,
        amount_eur: Number(income.amount_eur),
        frequency: income.frequency,
        scope: income.scope,
      });
    } else {
      setEditingIncomeId(null);
      setIncomeForm({ name: '', amount_eur: 0, frequency: 'monthly', scope: 'shared' });
    }
    setSection('income-form');
  }

  async function handleSaveIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!incomeForm.name || incomeForm.amount_eur <= 0) return;
    try {
      setSaving(true);
      if (editingIncomeId) {
        await updateIncomeSource(editingIncomeId, incomeForm);
        toast({ title: t('finance.toast.incomeUpdated') });
      } else {
        await createIncomeSource(incomeForm);
        toast({ title: t('finance.toast.incomeAdded') });
      }
      setSection('income');
      onUpdated();
    } catch (err) {
      console.error('Income save error:', err);
      toast({ title: t('common.error'), description: String(err), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteIncome(id: string) {
    try {
      await deleteIncomeSource(id);
      toast({ title: t('finance.toast.incomeDeleted') });
      await fetchIncomes();
      onUpdated();
    } catch (err) {
      console.error('Income delete error:', err);
      toast({ title: t('common.error'), description: String(err), variant: 'error' });
    }
  }

  // ── Fixed handlers ──
  function openFixedForm(fixed?: FixedExpense) {
    if (fixed) {
      setEditingFixedId(fixed.id);
      setFixedForm({
        name: fixed.name,
        amount_eur: Number(fixed.amount_eur),
        day_of_month: fixed.day_of_month,
        category: fixed.category,
        scope: fixed.scope,
      });
    } else {
      setEditingFixedId(null);
      setFixedForm({ name: '', amount_eur: 0, day_of_month: 1, category: 'genel', scope: 'shared' });
    }
    setSection('fixed-form');
  }

  async function handleSaveFixed(e: React.FormEvent) {
    e.preventDefault();
    if (!fixedForm.name || fixedForm.amount_eur <= 0) return;
    try {
      setSaving(true);
      if (editingFixedId) {
        await updateFixedExpense(editingFixedId, fixedForm);
        toast({ title: t('finance.toast.fixedUpdated') });
      } else {
        await createFixedExpense(fixedForm);
        toast({ title: t('finance.toast.fixedAdded') });
      }
      setSection('fixed');
      onUpdated();
    } catch (err) {
      console.error('Fixed save error:', err);
      toast({ title: t('common.error'), description: String(err), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFixed(id: string) {
    try {
      await deleteFixedExpense(id);
      toast({ title: t('finance.toast.fixedDeleted') });
      await fetchFixed();
      onUpdated();
    } catch (err) {
      console.error('Fixed delete error:', err);
      toast({ title: t('common.error'), description: String(err), variant: 'error' });
    }
  }

  // ── Buffer handlers ──
  async function handleSaveBuffer(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBufferSettings({
        target_amount_eur: parseFloat(bufferTarget) || 0,
        current_amount_eur: parseFloat(bufferCurrent) || 0,
      });
      toast({ title: t('finance.toast.bufferUpdated') });
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      console.error('Buffer save error:', err);
      toast({ title: t('common.error'), description: String(err), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──
  function renderContent() {
    switch (section) {
      case 'menu':
        return (
          <div className="space-y-2 p-4">
            <button
              onClick={() => setSection('income')}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="font-medium">{t('finance.settings.income')}</span>
              <span className="text-sm text-muted-foreground">
                {t('finance.settings.incomeDesc')}
              </span>
            </button>
            <button
              onClick={() => setSection('fixed')}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="font-medium">{t('finance.settings.fixed')}</span>
              <span className="text-sm text-muted-foreground">
                {t('finance.settings.fixedDesc')}
              </span>
            </button>
            <button
              onClick={() => setSection('buffer')}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="font-medium">{t('finance.settings.buffer')}</span>
              <span className="text-sm text-muted-foreground">
                {t('finance.settings.bufferDesc')}
              </span>
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                onOpenCategories();
              }}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="font-medium">{t('finance.category.title')}</span>
              <span className="text-sm text-muted-foreground">
                {t('finance.settings.categoriesDesc')}
              </span>
            </button>
          </div>
        );

      case 'income':
        return (
          <div className="space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSection('menu')}>
                {t('common.back')}
              </Button>
              <Button size="sm" onClick={() => openIncomeForm()}>
                <Plus className="mr-1 h-4 w-4" />
                {t('common.add')}
              </Button>
            </div>
            {incomes.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('finance.settings.noIncome')}
              </p>
            )}
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => openIncomeForm(inc)}
                >
                  <p className="text-sm font-medium">{inc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    €{Number(inc.amount_eur).toFixed(2)} · {t(`finance.frequency.${inc.frequency}`)}
                    {inc.scope === 'personal' && ` · ${t('finance.personal')}`}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleDeleteIncome(inc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        );

      case 'income-form':
        return (
          <form onSubmit={handleSaveIncome} className="space-y-4 overflow-y-auto p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSection('income')}
            >
              {t('common.back')}
            </Button>
            <div className="space-y-2">
              <Label>{t('finance.field.name')}</Label>
              <Input
                value={incomeForm.name}
                onChange={(e) =>
                  setIncomeForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t('finance.field.incomePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.field.amount')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={incomeForm.amount_eur || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val))
                    setIncomeForm((f) => ({ ...f, amount_eur: parseFloat(val) || 0 }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.field.frequency')}</Label>
              <div className="flex gap-2">
                {(['monthly', 'weekly', 'onetime'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() =>
                      setIncomeForm((f) => ({ ...f, frequency: freq }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      incomeForm.frequency === freq
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t(`finance.frequency.${freq}`)}
                  </button>
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
                    onClick={() =>
                      setIncomeForm((f) => ({ ...f, scope }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      incomeForm.scope === scope
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
        );

      case 'fixed':
        return (
          <div className="space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSection('menu')}>
                {t('common.back')}
              </Button>
              <Button size="sm" onClick={() => openFixedForm()}>
                <Plus className="mr-1 h-4 w-4" />
                {t('common.add')}
              </Button>
            </div>
            {fixedList.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('finance.settings.noFixed')}
              </p>
            )}
            {fixedList.map((fe) => (
              <div
                key={fe.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => openFixedForm(fe)}
                >
                  <p className="text-sm font-medium">{fe.name}</p>
                  <p className="text-xs text-muted-foreground">
                    €{Number(fe.amount_eur).toFixed(2)} · {t('finance.dayOfMonth', { day: fe.day_of_month })}
                    {fe.scope === 'personal' && ` · ${t('finance.personal')}`}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleDeleteFixed(fe.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        );

      case 'fixed-form':
        return (
          <form onSubmit={handleSaveFixed} className="space-y-4 overflow-y-auto p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSection('fixed')}
            >
              {t('common.back')}
            </Button>
            <div className="space-y-2">
              <Label>{t('finance.field.name')}</Label>
              <Input
                value={fixedForm.name}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t('finance.field.fixedPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.field.amount')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={fixedForm.amount_eur || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val))
                    setFixedForm((f) => ({ ...f, amount_eur: parseFloat(val) || 0 }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.field.dayOfMonth')}</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={fixedForm.day_of_month}
                onChange={(e) =>
                  setFixedForm((f) => ({
                    ...f,
                    day_of_month: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.field.scope')}</Label>
              <div className="flex gap-2">
                {(['shared', 'personal'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() =>
                      setFixedForm((f) => ({ ...f, scope }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      fixedForm.scope === scope
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
        );

      case 'buffer':
        return (
          <form onSubmit={handleSaveBuffer} className="space-y-4 overflow-y-auto p-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSection('menu')}
            >
              {t('common.back')}
            </Button>
            <div className="space-y-2">
              <Label>{t('finance.bufferField.target')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={bufferTarget}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setBufferTarget(val);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.bufferField.current')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={bufferCurrent}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setBufferCurrent(val);
                }}
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
        );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('finance.settings.title')}</SheetTitle>
          <SheetDescription>{t('finance.settings.description')}</SheetDescription>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
