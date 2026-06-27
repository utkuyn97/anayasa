/**
 * GoalFormDialog.tsx — Create a new goal with optional photo upload.
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Camera } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { createGoal } from './goals.api';
import type { GoalStatus } from './goals.types';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS: GoalStatus[] = ['dreaming', 'planned', 'in_progress'];

export default function GoalFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: GoalFormDialogProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [scope, setScope] = useState<'shared' | 'personal'>('shared');
  const [status, setStatus] = useState<GoalStatus>('dreaming');
  const [targetDate, setTargetDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setScope('shared');
    setStatus('dreaming');
    setTargetDate('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      await createGoal(
        {
          title: title.trim(),
          description: description.trim(),
          category: category.trim() || 'genel',
          scope,
          target_date: targetDate,
          status,
        },
        imageFile,
      );
      toast({ title: t('goals.toast.created'), variant: 'success' });
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
          <SheetTitle>{t('goals.form.title')}</SheetTitle>
          <SheetDescription>{t('goals.form.description')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* Image upload */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.image')}</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/50 transition-colors hover:bg-muted"
              style={{ aspectRatio: '16/9' }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">{t('goals.field.imageHint')}</span>
                </div>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('goals.field.titlePlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('goals.field.descriptionPlaceholder')}
              rows={3}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.category')}</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('goals.field.categoryPlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.status')}</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                    status === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(`goals.status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Target date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('goals.field.targetDate')}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t('common.optional')})
              </span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('goals.field.scope')}</label>
            <div className="flex gap-2">
              {(['shared', 'personal'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    scope === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(`finance.scope.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              t('goals.form.submit')
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
