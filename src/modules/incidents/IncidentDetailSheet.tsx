/**
 * IncidentDetailSheet — Full-screen photo + incident details.
 * Shows signed URL image, category, severity, reporter, timestamps.
 *
 * CONTRACT: D6
 */
import { useState, useEffect } from 'react';
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
import { getSignedUrl } from '@/lib/storage';
import { useUsers } from '@/hooks/useUsers';
import type { Incident } from './incidents.types';

interface IncidentDetailSheetProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: string) => Promise<void>;
}

export default function IncidentDetailSheet({
  incident,
  open,
  onOpenChange,
  onResolve,
}: IncidentDetailSheetProps) {
  const { t } = useTranslation();
  const { getUserById } = useUsers();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (open && incident?.photo_path) {
      setLoadingPhoto(true);
      getSignedUrl(incident.photo_path, 'incident-photos')
        .then(setPhotoUrl)
        .catch(() => setPhotoUrl(null))
        .finally(() => setLoadingPhoto(false));
    } else {
      setPhotoUrl(null);
    }
  }, [open, incident?.photo_path]);

  if (!incident) return null;

  const reporter = getUserById(incident.reported_by);
  const resolver = incident.resolved_by ? getUserById(incident.resolved_by) : null;
  const isResolved = !!incident.resolved_at;

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(incident.id);
      onOpenChange(false);
    } finally {
      setResolving(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[90dvh]">
        <SheetHeader>
          <SheetTitle>{incident.title}</SheetTitle>
          <SheetDescription>
            {t(`incidents.categories.${incident.category}`)} ·{' '}
            {t(`incidents.severity.${incident.severity}`)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
          {/* Photo */}
          {incident.photo_path && (
            <div className="overflow-hidden rounded-xl">
              {loadingPhoto ? (
                <div className="flex h-48 items-center justify-center bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : photoUrl ? (
                <img
                  src={photoUrl}
                  alt={incident.title}
                  className="h-auto w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                  {t('incidents.photoUnavailable')}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <p className="text-sm text-foreground">{incident.description}</p>
          )}

          {/* Meta */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{t('incidents.detail.reportedBy')}</span>
              <span className="font-medium text-foreground">
                {reporter?.display_name ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('incidents.detail.reportedAt')}</span>
              <span className="font-medium text-foreground">
                {formatDate(incident.reported_at)}
              </span>
            </div>
            {isResolved && (
              <>
                <div className="flex items-center justify-between">
                  <span>{t('incidents.detail.resolvedBy')}</span>
                  <span className="font-medium text-foreground">
                    {resolver?.display_name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('incidents.detail.resolvedAt')}</span>
                  <span className="font-medium text-foreground">
                    {formatDate(incident.resolved_at!)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Resolve button */}
          {!isResolved && (
            <Button
              onClick={handleResolve}
              disabled={resolving}
              className="mt-2 w-full"
            >
              {resolving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('incidents.action.resolve')}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
