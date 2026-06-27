/**
 * IncidentsPage — Incident log with Active/Resolved tabs,
 * photo thumbnails, category badges, and resolve action.
 *
 * CONTRACT: D1 (api), D4 (page)
 * Realtime: Incidents light subscribe (ARCHITECT § 10)
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Plus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import { useUsers } from '@/hooks/useUsers';
import { toast } from '@/components/ui/toast';
import { getSignedUrl } from '@/lib/storage';
import {
  createIncident,
  resolveIncident,
} from './incidents.api';
import type { Incident, IncidentFormData } from './incidents.types';
import IncidentFormSheet from './IncidentFormSheet';
import IncidentDetailSheet from './IncidentDetailSheet';

type TabType = 'active' | 'resolved';

/** Severity color mapping */
const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-orange-100 text-orange-700',
  crit: 'bg-red-100 text-red-700',
};

export default function IncidentsPage() {
  const { t } = useTranslation();
  const { getUserById } = useUsers();
  const [tab, setTab] = useState<TabType>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Realtime subscription (light)
  const { rows: allIncidents, isLoading } = useRealtimeRows<Incident>({
    table: 'incidents',
    orderBy: { column: 'reported_at', ascending: false },
  });

  // Split active vs resolved
  const activeIncidents = useMemo(
    () => allIncidents.filter((i) => !i.resolved_at),
    [allIncidents],
  );
  const resolvedIncidents = useMemo(
    () => allIncidents.filter((i) => !!i.resolved_at),
    [allIncidents],
  );

  const displayedIncidents = tab === 'active' ? activeIncidents : resolvedIncidents;

  // Load thumbnails for visible incidents
  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbs: Record<string, string> = {};
      for (const incident of displayedIncidents) {
        if (incident.photo_path && !thumbnails[incident.id]) {
          try {
            const url = await getSignedUrl(incident.photo_path, 'incident-photos');
            if (url) newThumbs[incident.id] = url;
          } catch {
            // Skip failed thumbnails
          }
        }
      }
      if (Object.keys(newThumbs).length > 0) {
        setThumbnails((prev) => ({ ...prev, ...newThumbs }));
      }
    };
    loadThumbnails();
  }, [displayedIncidents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleCreate = useCallback(
    async (data: IncidentFormData) => {
      await createIncident(data);
      toast({ title: t('incidents.toast.created'), variant: 'success' });
    },
    [t],
  );

  const handleResolve = useCallback(
    async (id: string) => {
      await resolveIncident(id);
      toast({ title: t('incidents.toast.resolved'), variant: 'success' });
    },
    [t],
  );

  const handleCardClick = useCallback((incident: Incident) => {
    setDetailIncident(incident);
    setDetailOpen(true);
  }, []);

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('incidents.title')}</h1>
        <Button size="icon" onClick={() => setFormOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'active'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('incidents.tab.active')}
          {activeIncidents.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">
              {activeIncidents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'resolved'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('incidents.tab.resolved')}
        </button>
      </div>

      {/* Empty state */}
      {displayedIncidents.length === 0 && (
        <EmptyState
          icon={
            tab === 'active' ? (
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            )
          }
          title={
            tab === 'active'
              ? t('incidents.empty.activeTitle')
              : t('incidents.empty.resolvedTitle')
          }
          description={
            tab === 'active'
              ? t('incidents.empty.activeDescription')
              : t('incidents.empty.resolvedDescription')
          }
        />
      )}

      {/* Incident cards */}
      <div className="space-y-3">
        {displayedIncidents.map((incident) => {
          const reporter = getUserById(incident.reported_by);
          const thumbUrl = thumbnails[incident.id];

          return (
            <Card
              key={incident.id}
              className="flex cursor-pointer gap-3 p-3 transition-colors hover:bg-muted/30 active:scale-[0.99]"
              onClick={() => handleCardClick(incident)}
            >
              {/* Thumbnail */}
              {incident.photo_path && (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className="flex-1 truncate text-sm font-medium">
                    {incident.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[incident.severity]}`}
                  >
                    {t(`incidents.severity.${incident.severity}`)}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{t(`incidents.categories.${incident.category}`)}</span>
                  <span>·</span>
                  <span>{reporter?.display_name ?? '—'}</span>
                  <span>·</span>
                  <span>{formatDate(incident.reported_at)}</span>
                </div>

                {incident.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {incident.description}
                  </p>
                )}

                {/* Quick resolve button on active tab */}
                {tab === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(incident.id);
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('incidents.action.resolve')}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Form sheet */}
      <IncidentFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Detail sheet */}
      <IncidentDetailSheet
        incident={detailIncident}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onResolve={handleResolve}
      />
    </div>
  );
}
