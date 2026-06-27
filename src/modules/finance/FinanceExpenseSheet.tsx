/**
 * FinanceExpenseSheet.tsx — Quick-add expense bottom sheet.
 * Category select + amount + note + date.
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

import type { ExpenseCategory } from './finance.types';
import { createExpense } from './finance.api';

interface FinanceExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  onCreated: () => void;
}

export default function FinanceExpenseSheet({
  open,
  onOpenChange,
  categories,
  onCreated,
}: FinanceExpenseSheetProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [spentAt, setSpentAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  function reset() {
    setCategoryId(null);
    setAmount('');
    setNote('');
    setSpentAt(new Date().toISOString().slice(0, 16));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      setSaving(true);
      await createExpense({
        category_id: categoryId,
        amount_eur: amountNum,
        note,
        spent_at: new Date(spentAt).toISOString(),
      });
      toast({ title: t('finance.toast.expenseAdded') });
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
          <SheetTitle>{t('finance.expense.title')}</SheetTitle>
          <SheetDescription>{t('finance.expense.description')}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>{t('finance.field.category')}</Label>
            <div className="flex flex-wrap gap-2">
              {/* Other / uncategorized option */}
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  categoryId === null
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full bg-gray-400"
                />
                {t('finance.expense.other')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    categoryId === cat.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color_hex }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="expense-amount">{t('finance.field.amount')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
              </span>
              <Input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={amount}
                onChange={(e) => {
                  // Accept both comma and dot as decimal separator
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                }}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="expense-note">{t('finance.field.note')}</Label>
            <Input
              id="expense-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('finance.field.notePlaceholder')}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="expense-date">{t('finance.field.date')}</Label>
            <Input
              id="expense-date"
              type="datetime-local"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !amount}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('finance.expense.submit')
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
