/**
 * LanguageToggle — TR/EN switch button.
 */
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();

  function toggle() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      <Globe className="h-5 w-5" />
      <span className="sr-only">
        {i18n.language === 'tr' ? t('settings.switchToEn') : t('settings.switchToTr')}
      </span>
    </Button>
  );
}
