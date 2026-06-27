/**
 * ShoppingFormSheet — Bottom sheet for adding shopping items.
 * Includes frequent items chip suggestions.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { ShoppingFormData, FrequentItem } from './shopping.types';

interface ShoppingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShoppingFormData) => Promise<void>;
  frequentItems: FrequentItem[];
}

const CATEGORIES = ['gıda', 'temizlik', 'kişisel bakım', 'ev', 'genel'];

export default function ShoppingFormSheet({
  open,
  onOpenChange,
  onSubmit,
  frequentItems,
}: ShoppingFormSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('adet');
  const [category, setCategory] = useState('genel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setQuantity('1');
      setUnit('adet');
      setCategory('genel');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
        note: null,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (item: FrequentItem) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: item.name,
        quantity: 1,
        unit: item.unit,
        category: item.category,
        note: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('shopping.form.title')}</SheetTitle>
          <SheetDescription>{t('shopping.form.description')}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
          {/* Frequent items chips */}
          {frequentItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('shopping.frequentItems')}
              </span>
              <div className="flex flex-wrap gap-2">
                {frequentItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleQuickAdd(item)}
                    disabled={isSubmitting}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 active:scale-95 disabled:opacity-50"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="shop-name">{t('shopping.field.name')}</Label>
              <Input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('shopping.field.namePlaceholder')}
                required
                autoFocus
              />
            </div>

            {/* Quantity + Unit + Category */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shop-qty">{t('shopping.field.quantity')}</Label>
                <Input
                  id="shop-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-unit">{t('shopping.field.unit')}</Label>
                <select
                  id="shop-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {['adet', 'kg', 'g', 'lt', 'ml', 'paket', 'kutu', 'şişe'].map((u) => (
                    <option key={u} value={u}>
                      {t(`inventory.units.${u}`, u)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-cat">{t('shopping.field.category')}</Label>
                <select
                  id="shop-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`shopping.categories.${c}`, c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? t('common.loading') : t('shopping.form.addButton')}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
