/**
 * ShoppingPage — Active shopping list with purchase checkboxes,
 * archive functionality, and frequent items suggestions.
 *
 * CONTRACT: C1 (api), C2 (page)
 * Realtime: E2 (subscribe to shopping changes)
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  Archive,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import { useUsers } from '@/hooks/useUsers';
import { toast } from '@/components/ui/toast';
import {
  addShoppingItem,
  markPurchased,
  undoPurchase,
  archivePurchased,
  getFrequentItems,
  deleteShoppingItem,
} from './shopping.api';
import type { ShoppingItem, ShoppingFormData, FrequentItem } from './shopping.types';
import ShoppingFormSheet from './ShoppingFormSheet';

export default function ShoppingPage() {
  const { t } = useTranslation();
  const { getUserById } = useUsers();
  const [formOpen, setFormOpen] = useState(false);
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [archiving, setArchiving] = useState(false);

  // Realtime subscription (E2)
  const { rows: allItems, isLoading } = useRealtimeRows<ShoppingItem>({
    table: 'shopping_items',
    orderBy: { column: 'added_at', ascending: false },
  });

  // Filter out archived items client-side (realtime doesn't support is null filter well)
  const items = useMemo(
    () => allItems.filter((i) => !i.archived_at),
    [allItems],
  );

  // Split active vs purchased
  const activeItems = useMemo(
    () => items.filter((i) => !i.purchased),
    [items],
  );
  const purchasedItems = useMemo(
    () => items.filter((i) => i.purchased),
    [items],
  );

  // Load frequent items
  useEffect(() => {
    getFrequentItems(30).then(setFrequentItems).catch(() => {});
  }, []);

  // Handlers
  const handleAdd = useCallback(
    async (data: ShoppingFormData) => {
      await addShoppingItem(data);
      toast({ title: t('shopping.toast.added'), variant: 'success' });
    },
    [t],
  );

  const handleTogglePurchase = useCallback(
    async (item: ShoppingItem) => {
      try {
        if (item.purchased) {
          await undoPurchase(item.id);
        } else {
          await markPurchased(item.id);
        }
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    },
    [t],
  );

  const handleArchive = useCallback(async () => {
    setArchiving(true);
    try {
      const count = await archivePurchased();
      if (count > 0) {
        toast({ title: t('shopping.toast.archived', { count }), variant: 'success' });
      }
    } catch {
      toast({ title: t('common.error'), variant: 'error' });
    } finally {
      setArchiving(false);
    }
  }, [t]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteShoppingItem(id);
        toast({ title: t('shopping.toast.deleted'), variant: 'success' });
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    },
    [t],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('shopping.title')}</h1>
        <Button size="icon" onClick={() => setFormOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
          title={t('shopping.empty.title')}
          description={t('shopping.empty.description')}
        />
      )}

      {/* Active items */}
      {activeItems.length > 0 && (
        <div className="space-y-2">
          {activeItems.map((item) => {
            const addedByUser = getUserById(item.added_by);
            return (
              <Card key={item.id} className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleTogglePurchase(item)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground/40 transition-colors hover:border-primary active:scale-90"
                >
                  {/* empty */}
                </button>

                {/* Name + details */}
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                    {addedByUser && (
                      <>
                        <span>·</span>
                        <span>{addedByUser.display_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Purchased section */}
      {purchasedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {t('shopping.purchasedCount', { count: purchasedItems.length })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('shopping.archiveButton')}
            </Button>
          </div>

          {purchasedItems.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 bg-muted/30 p-3">
              {/* Filled checkbox */}
              <button
                onClick={() => handleTogglePurchase(item)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors active:scale-90"
              >
                <Check className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-muted-foreground line-through">
                  {item.name}
                </span>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form sheet */}
      <ShoppingFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleAdd}
        frequentItems={frequentItems}
      />
    </div>
  );
}
