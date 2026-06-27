/**
 * CalendarPage.tsx — Calendar module main page.
 *
 * Features:
 * - Month grid view with event dots
 * - List view with date-grouped events
 * - Toggle between month and list
 * - Filter: all / shared / personal
 * - Realtime sync for household events
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { formatTime, formatDateShort } from '@/lib/format';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import EmptyState from '@/components/EmptyState';
import type { CalendarEvent } from './calendar.types';
import EventFormDialog from './EventFormDialog';
import EventDetailDialog from './EventDetailDialog';

type ViewMode = 'month' | 'list';
type FilterMode = 'all' | 'shared' | 'personal';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { getUserById } = useUsers();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const locale = i18n.language === 'en' ? enUS : tr;

  // Calculate date range for current month view (includes partial weeks)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { rows: events, isLoading, refetch } = useRealtimeRows<CalendarEvent>({
    table: 'calendar_events',
    select: '*',
    orderBy: { column: 'start_at', ascending: true },
    realtime: true,
  });

  // Filter events by scope
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterMode === 'shared') return ev.scope === 'shared';
      if (filterMode === 'personal') return ev.scope === 'personal' && ev.owner_id === user?.id;
      return true;
    });
  }, [events, filterMode, user?.id]);

  // Events in current month range (includes multi-day events that overlap)
  const monthEvents = useMemo(() => {
    const rangeStart = calendarStart.getTime();
    const rangeEnd = calendarEnd.getTime();
    return filteredEvents.filter((ev) => {
      const evStart = new Date(ev.start_at).getTime();
      const evEnd = ev.end_at ? new Date(ev.end_at).getTime() : evStart;
      // Event overlaps with calendar range if it starts before range ends AND ends after range starts
      return evStart <= rangeEnd && evEnd >= rangeStart;
    });
  }, [filteredEvents, calendarStart, calendarEnd]);

  // Days for the calendar grid
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Group events by date for list view (multi-day events appear on each day)
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    const sorted = [...monthEvents].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    for (const ev of sorted) {
      const evStart = new Date(ev.start_at);
      const evEnd = ev.end_at ? new Date(ev.end_at) : evStart;
      // For each day the event spans, add it to that day's group
      const days = eachDayOfInterval({ start: evStart, end: evEnd });
      for (const day of days) {
        // Only include days within the current month view
        if (day >= calendarStart && day <= calendarEnd) {
          const key = format(day, 'yyyy-MM-dd');
          const arr = groups.get(key) ?? [];
          if (!arr.some((e) => e.id === ev.id)) {
            arr.push(ev);
          }
          groups.set(key, arr);
        }
      }
    }
    return groups;
  }, [monthEvents, calendarStart, calendarEnd]);

  const getEventsForDay = useCallback(
    (day: Date): CalendarEvent[] => {
      const dayStart = day.getTime();
      const dayEnd = dayStart + 86400000 - 1; // end of day
      return monthEvents.filter((ev) => {
        const evStart = new Date(ev.start_at).getTime();
        const evEnd = ev.end_at ? new Date(ev.end_at).getTime() : evStart;
        // Event covers this day if it starts before day ends AND ends after day starts
        return evStart <= dayEnd && evEnd >= dayStart;
      });
    },
    [monthEvents],
  );

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleEventCreated = () => {
    refetch();
    setFormOpen(false);
  };

  const handleEditClick = (ev: CalendarEvent) => {
    setSelectedEvent(null);
    setEditEvent(ev);
    setFormOpen(true);
  };

  const handleEditDone = () => {
    refetch();
    setFormOpen(false);
    setEditEvent(null);
  };

  const handleDeleted = () => {
    setSelectedEvent(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('calendar.title')}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'month'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => { setEditEvent(null); setFormOpen(true); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(['all', 'shared', 'personal'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filterMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t(`calendar.filter.${mode}`)}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="rounded-lg p-2 transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="rounded-lg p-2 transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : viewMode === 'month' ? (
        /* ─── Month Grid View ──────────────────────────────────────── */
        <div className="rounded-2xl border bg-card p-3">
          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAY_KEYS.map((key) => (
              <div
                key={key}
                className="py-1 text-center text-[11px] font-medium text-muted-foreground"
              >
                {t(`calendar.weekday.${key}`)}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    if (dayEvents.length === 1) {
                      setSelectedEvent(dayEvents[0]);
                    } else if (dayEvents.length > 1) {
                      setViewMode('list');
                    }
                  }}
                  className={cn(
                    'relative flex h-11 flex-col items-center justify-start rounded-lg py-1 text-xs transition-colors',
                    inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    today && 'bg-primary/10 font-bold',
                    dayEvents.length > 0 && 'hover:bg-muted',
                  )}
                >
                  <span className={cn(
                    'text-[11px]',
                    today && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]',
                  )}>
                    {format(day, 'd')}
                  </span>
                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: ev.color_hex }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── List View ───────────────────────────────────────────── */
        <div className="space-y-4">
          {groupedEvents.size === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-8 w-8 text-muted-foreground" />}
              title={t('calendar.empty.title')}
              description={t('calendar.empty.description')}
            />
          ) : (
            Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  {formatDateShort(parseISO(dateKey))}
                </h3>
                <div className="space-y-2">
                  {dayEvents.map((ev) => {
                    const creator = getUserById(ev.created_by);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: ev.color_hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{ev.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {!ev.all_day && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(ev.start_at)}
                                {ev.end_at && ` – ${formatTime(ev.end_at)}`}
                              </span>
                            )}
                            {ev.all_day && (
                              <span>{t('calendar.allDay')}</span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.location}
                              </span>
                            )}
                            {creator && (
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${creator.color_hex}20`,
                                  color: creator.color_hex,
                                }}
                              >
                                {creator.display_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form dialog */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditEvent(null); } }}
        onSuccess={editEvent ? handleEditDone : handleEventCreated}
        editEvent={editEvent}
      />

      {/* Detail dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
          onEdit={handleEditClick}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
