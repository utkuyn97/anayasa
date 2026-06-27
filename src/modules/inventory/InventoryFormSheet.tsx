/**
 * InventoryFormSheet — Bottom sheet form for adding/editing inventory items.
 * Mobile-first, uses shadcn Sheet + Input components.
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
import type { InventoryItem, InventoryFormData } from './inventory.types';

interface InventoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  editItem?: InventoryItem | null;
}

const UNITS = ['adet', 'kg', 'g', 'lt', 'ml', 'paket', 'kutu', 'şişe'];
const CATEGORIES = ['mutfak', 'banyo', 'temizlik', 'kırtasiye', 'genel'];

export default function InventoryFormSheet({
  open,
  onOpenChange,
  onSubmit,
  editItem,
}: InventoryFormSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('adet');
  const [category, setCategory] = useState('genel');
  const [lowThreshold, setLowThreshold] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setQuantity(String(editItem.quantity));
      setUnit(editItem.unit);
      setCategory(editItem.category);
      setLowThreshold(editItem.low_threshold != null ? String(editItem.low_threshold) : '');
      setNote(editItem.note ?? '');
    } else {
      setName('');
      setQuantity('1');
      setUnit('adet');
      setCategory('genel');
      setLowThreshold('');
      setNote('');
    }
  }, [editItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        quantity: parseFloat(quantity) || 0,
        unit,
        category,
        low_threshold: lowThreshold ? parseFloat(lowThreshold) : null,
        note: note.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {editItem ? t('inventory.form.editTitle') : t('inventory.form.title')}
          </SheetTitle>
          <SheetDescription>
            {editItem ? t('inventory.form.editDescription') : t('inventory.form.description')}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="inv-name">{t('inventory.field.name')}</Label>
            <Input
              id="inv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inventory.field.namePlaceholder')}
              required
              autoFocus
            />
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inv-qty">{t('inventory.field.quantity')}</Label>
              <Input
                id="inv-qty"
                type="number"
                min="0"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-unit">{t('inventory.field.unit')}</Label>
              <select
                id="inv-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`inventory.units.${u}`, u)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="inv-cat">{t('inventory.field.category')}</Label>
            <select
              id="inv-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`inventory.categories.${c}`, c)}
                </option>
              ))}
            </select>
          </div>

          {/* Low threshold */}
          <div className="space-y-2">
            <Label htmlFor="inv-threshold">{t('inventory.field.lowThreshold')}</Label>
            <Input
              id="inv-threshold"
              type="number"
              min="0"
              step="1"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
              placeholder={t('inventory.field.lowThresholdHint')}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="inv-note">{t('inventory.field.note')}</Label>
            <Input
              id="inv-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('inventory.field.notePlaceholder')}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting || !name.trim()}>
            {isSubmitting
              ? t('common.loading')
              : editItem
                ? t('common.save')
                : t('inventory.form.addButton')}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
