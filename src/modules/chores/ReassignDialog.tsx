/**
 * ReassignDialog.tsx — Dialog to reassign a chore instance or chore.
 *
 * Two modes:
 * - 'instance': tek seferlik devir (D-0016)
 * - 'chore': kalıcı atama değişimi (D-0016)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/UserAvatar';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'instance' | 'chore';
  title: string;
  onConfirm: (newAssignee: string | null) => void;
}

export default function ReassignDialog({
  open,
  onOpenChange,
  mode,
  title,
  onConfirm,
}: ReassignDialogProps) {
  const { t } = useTranslation();
  const { users } = useUsers();
  const { user } = useAuth();
  // Use undefined = nothing selected yet, null = unassigned chosen, string = user chosen
  const [selected, setSelected] = useState<string | null | undefined>(undefined);

  const options = [
    ...users.map((u) => ({
      id: u.id,
      label: u.display_name,
      color: u.color_hex,
      isCurrent: u.id === user?.id,
    })),
    {
      id: null as string | null,
      label: t('chores.unassigned'),
      color: '#9ca3af',
      isCurrent: false,
    },
  ];

  const handleSubmit = () => {
    if (selected === undefined) return;
    onConfirm(selected);
    onOpenChange(false);
    setSelected(undefined);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {mode === 'instance'
              ? t('chores.action.reassignOnce')
              : t('chores.action.reassignPermanent')}
          </SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4 pb-6 pt-4">
          {/* User options */}
          {options.map((opt) => (
            <button
              key={opt.id ?? 'unassigned'}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                selected === opt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-muted',
              )}
            >
              <UserAvatar
                displayName={opt.label}
                colorHex={opt.color}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                {opt.isCurrent && (
                  <p className="text-xs text-muted-foreground">
                    {t('chores.reassign.you')}
                  </p>
                )}
              </div>
              {selected === opt.id && (
                <div className="h-4 w-4 rounded-full bg-primary" />
              )}
            </button>
          ))}

          {/* Permanent reassign warning */}
          {mode === 'chore' && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-xs text-orange-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('chores.reassign.warningPermanent')}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={selected === undefined}
            className="mt-4 w-full"
          >
            {t('common.confirm')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
