/**
 * MoreSheet — Bottom sheet showing extra modules.
 * Inventory, Shopping, Incidents, Calendar, Body, Smoking, Goals, Settings.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Weight,
  Cigarette,
  Target,
  Settings,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const moreItems = [
  { path: '/inventory', icon: Package, labelKey: 'more.inventory' },
  { path: '/shopping', icon: ShoppingCart, labelKey: 'more.shopping' },
  { path: '/incidents', icon: AlertTriangle, labelKey: 'more.incidents' },
  { path: '/calendar', icon: Calendar, labelKey: 'more.calendar' },
  { path: '/body', icon: Weight, labelKey: 'more.body' },
  { path: '/smoking', icon: Cigarette, labelKey: 'more.smoking' },
  { path: '/goals', icon: Target, labelKey: 'more.goals' },
  { path: '/settings', icon: Settings, labelKey: 'more.settings' },
] as const;

export default function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleNavigate(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('more.title')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('more.title')}
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-4 gap-4 px-4 py-6">
          {moreItems.map(({ path, icon: Icon, labelKey }) => (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors active:bg-muted"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-6 w-6 text-foreground" />
              </div>
              <span className="text-[11px] font-medium leading-tight text-center">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
