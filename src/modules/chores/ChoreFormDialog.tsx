/**
 * ChoreFormDialog.tsx — Create or edit a chore.
 *
 * Fields: title, description, frequency, frequency_value, deadline_hours, assigned_to.
 * Edit mode: pass `editChore` prop with existing data.
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
import { useUsers } from '@/hooks/useUsers';
import type { ChoreFormData, FrequencyType, Chore } from './chores.types';

interface ChoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ChoreFormData) => Promise<void>;
  /** If provided, form opens in edit mode with pre-filled values. */
  editChore?: Pick<Chore, 'id' | 'title' | 'description' | 'frequency_type' | 'frequency_value' | 'deadline_hours' | 'assigned_to'> | null;
}

const frequencyOptions: FrequencyType[] = [
  'once',
  'daily',
  'weekly',
  'monthly',
  'custom_days',
];

export default function ChoreFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editChore,
}: ChoreFormDialogProps) {
  const { t } = useTranslation();
  const { users } = useUsers();
  const isEditing = !!editChore;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyValue, setFrequencyValue] = useState(1);
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editChore && open) {
      setTitle(editChore.title);
      setDescription(editChore.description ?? '');
      setFrequencyType(editChore.frequency_type);
      setFrequencyValue(editChore.frequency_value);
      setDeadlineHours(editChore.deadline_hours);
      setAssignedTo(editChore.assigned_to);
    } else if (!open) {
      // Reset on close
      resetForm();
    }
  }, [editChore, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFrequencyType('daily');
    setFrequencyValue(1);
    setDeadlineHours(24);
    setAssignedTo(null);
    setStartDate('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency_type: frequencyType,
        frequency_value: frequencyValue,
        deadline_hours: deadlineHours,
        assigned_to: assignedTo,
        start_date: startDate || undefined,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('chores.form.editTitle') : t('chores.form.title')}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? t('chores.form.editDescription') : t('chores.form.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="chore-title">{t('chores.field.title')}</Label>
            <Input
              id="chore-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('chores.field.titlePlaceholder')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="chore-desc">{t('chores.field.description')}</Label>
            <Input
              id="chore-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('chores.field.descriptionPlaceholder')}
            />
          </div>

          {/* Frequency — disabled in edit mode (changing frequency on existing chore is risky) */}
          <div className="space-y-2">
            <Label>{t('chores.field.frequency')}</Label>
            <div className="flex flex-wrap gap-2">
              {frequencyOptions.map((freq) => (
                <button
                  key={freq}
                  onClick={() => !isEditing && setFrequencyType(freq)}
                  disabled={isEditing}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    frequencyType === freq
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t(`chores.frequency.${freq}`)}
                </button>
              ))}
            </div>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                {t('chores.form.frequencyLocked')}
              </p>
            )}
          </div>

          {/* Frequency value (for custom) */}
          {(frequencyType === 'custom_days' || frequencyType === 'hourly') && (
            <div className="space-y-2">
              <Label htmlFor="chore-freq-val">
                {frequencyType === 'hourly'
                  ? t('chores.field.everyNHours')
                  : t('chores.field.everyNDays')}
              </Label>
              <Input
                id="chore-freq-val"
                type="number"
                min={1}
                max={365}
                value={frequencyValue}
                onChange={(e) => setFrequencyValue(Number(e.target.value) || 1)}
                disabled={isEditing}
              />
            </div>
          )}

          {/* Start date — only in create mode, for recurring chores */}
          {!isEditing && frequencyType !== 'once' && (
            <div className="space-y-2">
              <Label htmlFor="chore-start">{t('chores.field.startDate')}</Label>
              <Input
                id="chore-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                {t('chores.field.startDateHint')}
              </p>
            </div>
          )}

          {/* Deadline hours */}
          <div className="space-y-2">
            <Label htmlFor="chore-deadline">
              {t('chores.field.deadlineHours')}
            </Label>
            <Input
              id="chore-deadline"
              type="number"
              min={1}
              max={168}
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(Number(e.target.value) || 24)}
            />
            <p className="text-xs text-muted-foreground">
              {t('chores.field.deadlineHoursHint')}
            </p>
          </div>

          {/* Assignment */}
          <div className="space-y-2">
            <Label>{t('chores.field.assignedTo')}</Label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setAssignedTo(null)}
                className={`rounded-xl border-2 px-4 py-2.5 text-left text-sm ${
                  assignedTo === null
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted'
                }`}
              >
                {t('chores.unassigned')}
              </button>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setAssignedTo(u.id)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm ${
                    assignedTo === u.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted'
                  }`}
                >
                  <div
                    className="h-6 w-6 rounded-full text-center text-xs font-semibold leading-6 text-white"
                    style={{ backgroundColor: u.color_hex }}
                  >
                    {u.display_name.charAt(0)}
                  </div>
                  {u.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? t('common.loading')
              : isEditing
                ? t('common.save')
                : t('chores.form.submit')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
