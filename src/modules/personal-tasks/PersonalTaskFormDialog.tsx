/**
 * PersonalTaskFormDialog.tsx — Form to create a personal task.
 *
 * Fields: title, description, due_at, priority, tags, recurrence.
 */
import { useState } from 'react';
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
import type {
  PersonalTaskFormData,
  Priority,
  PersonalRecurrence,
} from './personalTasks.types';

interface PersonalTaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PersonalTaskFormData) => Promise<void>;
}

const priorityOptions: Priority[] = ['low', 'med', 'high'];

type RecurrenceOption = 'none' | PersonalRecurrence;
const recurrenceOptions: RecurrenceOption[] = ['none', 'daily', 'weekly', 'monthly'];

export default function PersonalTaskFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: PersonalTaskFormDialogProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<Priority>('med');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueAt('');
    setPriority('med');
    setTagInput('');
    setTags([]);
    setRecurrence('none');
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        due_at: dueAt || undefined,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        recurrence: recurrence !== 'none' ? recurrence : undefined,
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
          <SheetTitle>{t('personalTasks.form.title')}</SheetTitle>
          <SheetDescription>
            {t('personalTasks.form.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="pt-title">{t('personalTasks.field.title')}</Label>
            <Input
              id="pt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('personalTasks.field.titlePlaceholder')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="pt-desc">
              {t('personalTasks.field.description')}
            </Label>
            <Input
              id="pt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('personalTasks.field.descriptionPlaceholder')}
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label>{t('personalTasks.field.recurrence')}</Label>
            <div className="flex gap-2">
              {recurrenceOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRecurrence(r)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    recurrence === r
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {t(`personalTasks.recurrence.${r}`)}
                </button>
              ))}
            </div>
            {recurrence !== 'none' && (
              <p className="text-xs text-muted-foreground">
                {t('personalTasks.field.recurrenceHint')}
              </p>
            )}
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <Label htmlFor="pt-due">{t('personalTasks.field.dueAt')}</Label>
            <Input
              id="pt-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>{t('personalTasks.field.priority')}</Label>
            <div className="flex gap-2">
              {priorityOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    priority === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {t(`personalTasks.priority.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t('personalTasks.field.tags')}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder={t('personalTasks.field.tagPlaceholder')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                +
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? t('common.loading')
              : t('personalTasks.form.submit')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
