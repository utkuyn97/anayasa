/**
 * Header — App name + user avatar.
 * Minimal top bar for mobile.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-md pt-safe-top">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <h1 className="text-lg font-semibold text-primary">{t('app.name')}</h1>

        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2"
        >
          {/* User avatar circle */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: userInfo?.color_hex ?? '#3b82f6' }}
          >
            {userInfo?.display_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </button>
      </div>
    </header>
  );
}
