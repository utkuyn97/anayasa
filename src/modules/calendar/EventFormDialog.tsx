/**
 * EventFormDialog.tsx — Create/edit calendar event form.
 *
 * Fields: title, description, start date/time, end date/time (optional),
 * all_day toggle, scope (shared/personal), location.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { createEvent, updateEvent } from './calendar.api';
import type { CalendarEvent, CalendarEventFormData } from './calendar.types';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editEvent?: CalendarEvent | null;
}

function getDefaultDateTime(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return format(now, "yyyy-MM-dd'T'HH:mm");
}

export default function EventFormDialog({
  open,
  onOpenChange,
  onSuccess,
  editEvent,
}: EventFormDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(getDefaultDateTime());
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [scope, setScope] = useState<'shared' | 'personal'>('shared');
  const [location, setLocation] = useState('');
  const [colorHex, setColorHex] = useState('#3b82f6');

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? '');
      setStartAt(format(new Date(editEvent.start_at), "yyyy-MM-dd'T'HH:mm"));
      setEndAt(editEvent.end_at ? format(new Date(editEvent.end_at), "yyyy-MM-dd'T'HH:mm") : '');
      setAllDay(editEvent.all_day);
      setScope(editEvent.scope);
      setLocation(editEvent.location ?? '');
      setColorHex(editEvent.color_hex ?? '#3b82f6');
    } else {
      setTitle('');
      setDescription('');
      setStartAt(getDefaultDateTime());
      setEndAt('');
      setAllDay(false);
      setScope('shared');
      setLocation('');
      setColorHex('#3b82f6');
    }
  }, [editEvent, open]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      const formData: CalendarEventFormData = {
        title: title.trim(),
        description: description.trim(),
        start_at: allDay
          ? new Date(startAt).toISOString().split('T')[0] + 'T00:00:00.000Z'
          : new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : '',
        all_day: allDay,
        location: location.trim(),
        scope,
        color_hex: colorHex,
      };

      if (editEvent) {
        await updateEvent(editEvent.id, formData);
        toast({ title: t('calendar.toast.updated'), variant: 'success' });
      } else {
        await createEvent(formData);
        toast({ title: t('calendar.toast.created'), variant: 'success' });
      }
      onSuccess();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!editEvent;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? t('calendar.form.editTitle') : t('calendar.form.title')}
          </SheetTitle>
          <SheetDescription>
            {isEdit ? t('calendar.form.editDescription') : t('calendar.form.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('calendar.field.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('calendar.field.titlePlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('calendar.field.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.field.descriptionPlaceholder')}
              rows={2}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t('calendar.field.allDay')}</label>
            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allDay ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allDay ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Start */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('calendar.field.startAt')}</label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? startAt.split('T')[0] : startAt}
              onChange={(e) => setStartAt(allDay ? e.target.value + 'T00:00' : e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* End (optional) */}
          {!allDay && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('calendar.field.endAt')}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({t('common.optional')})
                </span>
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('calendar.field.location')}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t('common.optional')})
              </span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('calendar.field.locationPlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('calendar.field.scope')}</label>
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

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('calendar.field.color')}</label>
            <div className="flex flex-wrap gap-2">
              {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    colorHex === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
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
            ) : isEdit ? (
              t('common.save')
            ) : (
              t('calendar.form.submit')
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
