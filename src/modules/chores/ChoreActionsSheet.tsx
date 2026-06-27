/**
 * ChoreActionsSheet.tsx — Bottom sheet with chore instance actions.
 *
 * Actions: Tamamla / Devret (tek) / Devret (kalıcı) / Düzenle / Atla / Sil
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ArrowRightLeft,
  ArrowRight,
  SkipForward,
  Trash2,
  Pencil,
  XCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { ChoreInstanceWithChore } from './chores.types';

interface ChoreActionsSheetProps {
  instance: ChoreInstanceWithChore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (id: string) => void;
  onReassignInstance: (instance: ChoreInstanceWithChore) => void;
  onReassignChore: (instance: ChoreInstanceWithChore) => void;
  onSkip: (id: string) => void;
  onDelete: (choreId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onEdit: (instance: ChoreInstanceWithChore) => void;
}

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export default function ChoreActionsSheet({
  instance,
  open,
  onOpenChange,
  onComplete,
  onReassignInstance,
  onReassignChore,
  onSkip,
  onDelete,
  onDeleteInstance,
  onEdit,
}: ChoreActionsSheetProps) {
  const { t } = useTranslation();
  const [skipNote, setSkipNote] = useState('');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!instance) return null;

  const actions: ActionItem[] = [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      label: t('chores.action.complete'),
      onClick: () => {
        onComplete(instance.id);
        onOpenChange(false);
      },
      variant: 'success',
    },
    {
      icon: <ArrowRightLeft className="h-5 w-5 text-blue-500" />,
      label: t('chores.action.reassignOnce'),
      description: t('chores.action.reassignOnceDesc'),
      onClick: () => {
        onReassignInstance(instance);
        onOpenChange(false);
      },
    },
    {
      icon: <ArrowRight className="h-5 w-5 text-orange-500" />,
      label: t('chores.action.reassignPermanent'),
      description: t('chores.action.reassignPermanentDesc'),
      onClick: () => {
        onReassignChore(instance);
        onOpenChange(false);
      },
      variant: 'warning',
    },
    {
      icon: <Pencil className="h-5 w-5 text-violet-500" />,
      label: t('chores.action.edit'),
      description: t('chores.action.editDesc'),
      onClick: () => {
        onEdit(instance);
        onOpenChange(false);
      },
    },
    {
      icon: <SkipForward className="h-5 w-5 text-muted-foreground" />,
      label: t('chores.action.skip'),
      onClick: () => {
        if (showSkipInput) {
          onSkip(instance.id);
          onOpenChange(false);
          setShowSkipInput(false);
          setSkipNote('');
        } else {
          setShowSkipInput(true);
        }
      },
    },
    {
      icon: <XCircle className="h-5 w-5 text-orange-500" />,
      label: t('chores.action.deleteInstance'),
      description: t('chores.action.deleteInstanceDesc'),
      onClick: () => {
        onDeleteInstance(instance.id);
        onOpenChange(false);
      },
      variant: 'warning',
    },
    {
      icon: <Trash2 className="h-5 w-5 text-red-500" />,
      label: confirmDelete ? t('chores.action.deleteConfirm') : t('chores.action.delete'),
      description: confirmDelete ? undefined : t('chores.action.deleteDesc'),
      onClick: () => {
        if (confirmDelete) {
          onDelete(instance.chore_id);
          onOpenChange(false);
          setConfirmDelete(false);
        } else {
          setConfirmDelete(true);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmDelete(false); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{instance.chore.title}</SheetTitle>
          <SheetDescription>
            {t('chores.actionsSheetDesc')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-6 pt-4">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors active:scale-[0.98] ${
                action.variant === 'destructive' && confirmDelete
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'hover:bg-muted'
              }`}
            >
              {action.icon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{action.label}</p>
                {action.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                )}
              </div>
            </button>
          ))}

          {/* Skip note input */}
          {showSkipInput && (
            <div className="mt-2 px-4">
              <input
                type="text"
                value={skipNote}
                onChange={(e) => setSkipNote(e.target.value)}
                placeholder={t('chores.skipNotePlaceholder')}
                className="w-full rounded-xl border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    onSkip(instance.id);
                    onOpenChange(false);
                    setShowSkipInput(false);
                    setSkipNote('');
                  }}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  {t('chores.action.skipConfirm')}
                </button>
                <button
                  onClick={() => {
                    setShowSkipInput(false);
                    setSkipNote('');
                  }}
                  className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
