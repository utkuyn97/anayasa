/**
 * EmptyState — Reusable empty/coming-soon state component.
 * Used across all module pages in Sprint 1.
 */
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        {icon ?? <Construction className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h2 className="text-lg font-semibold">
        {title ?? t('empty.comingSoon')}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {description ?? t('empty.comingSoonDesc')}
      </p>
    </div>
  );
}
