/**
 * SettingsPage — Language, theme, account, logout.
 */
import { useTranslation } from 'react-i18next';
import { LogOut, Globe, Shield, Sun, Moon, Monitor } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

const themeOptions: { value: ThemeOption; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'settings.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'settings.themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'settings.themeSystem' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { userInfo, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  function toggleLanguage() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.account')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {userInfo?.email}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {userInfo?.role}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Sun className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{t('settings.theme')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors',
                  theme === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground active:bg-muted/80',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardContent className="p-4">
          <button
            onClick={toggleLanguage}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t('settings.language')}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {i18n.language === 'tr'
                ? t('settings.languageTr')
                : t('settings.languageEn')}
            </span>
          </button>
        </CardContent>
      </Card>

      {/* PIN change — placeholder */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 opacity-50">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t('settings.changePin')}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {t('common.comingSoon')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={logout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t('auth.logout')}
      </Button>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        {t('settings.version')}: 1.0.0
      </p>
    </div>
  );
}
