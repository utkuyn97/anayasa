/**
 * BottomNav — iPhone sticky bottom navigation.
 * 5 tabs: Home, Tasks, Finance, Nutrition, More.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, CheckSquare, Wallet, UtensilsCrossed, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/tasks/me', icon: CheckSquare, labelKey: 'nav.tasks' },
  { path: '/finance', icon: Wallet, labelKey: 'nav.finance' },
  { path: '/calories', icon: UtensilsCrossed, labelKey: 'nav.calories' },
] as const;

export default function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md pb-safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={onMoreClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  );
}
