/**
 * NotFoundPage — 404 catch-all.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen-dvh flex-col items-center justify-center p-6 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <p className="mt-2 text-lg font-medium">{t('common.error')}</p>
      <Button
        variant="outline"
        className="mt-6"
        onClick={() => navigate('/')}
      >
        <Home className="mr-2 h-4 w-4" />
        {t('nav.home')}
      </Button>
    </div>
  );
}
