/**
 * EventDetailDialog.tsx — Calendar event detail view.
 *
 * Shows event details + edit/delete actions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Calendar, Trash2, Edit3, Users, User } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useUsers } from '@/hooks/useUsers';
import { formatDate, formatTime } from '@/lib/format';
import { deleteEvent } from './calendar.api';
import type { CalendarEvent } from './calendar.types';

interface EventDetailDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CalendarEvent) => void;
  onDeleted: () => void;
}

export default function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
}: EventDetailDialogProps) {
  const { t } = useTranslation();
  const { getUserById } = useUsers();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const creator = getUserById(event.created_by);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      toast({ title: t('calendar.toast.deleted'), variant: 'success' });
      onDeleted();
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color_hex }}
            />
            {event.title}
          </SheetTitle>
          <SheetDescription>
            {event.scope === 'shared' ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {t('finance.scope.shared')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {t('finance.scope.personal')}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p>{formatDate(event.start_at)}</p>
              {!event.all_day && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(event.start_at)}
                  {event.end_at && ` – ${formatTime(event.end_at)}`}
                </p>
              )}
              {event.all_day && (
                <p className="text-muted-foreground">{t('calendar.allDay')}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: creator.color_hex }}
              >
                {creator.display_name.charAt(0)}
              </div>
              <span>{creator.display_name}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onEdit(event)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Edit3 className="h-4 w-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                confirmDelete
                  ? 'bg-destructive text-destructive-foreground'
                  : 'border text-destructive hover:bg-destructive/10'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? t('common.confirm') : t('common.delete')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
