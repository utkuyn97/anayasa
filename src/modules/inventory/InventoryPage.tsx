/**
 * InventoryPage — Category-grouped inventory list with search, +/- buttons,
 * low threshold warnings, and "add to shopping" functionality.
 *
 * CONTRACT: B1 (api), B2 (page), B3 (low stock band)
 * Realtime: E1 (subscribe to inventory changes)
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  ShoppingCart,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import { useRealtimeRows } from '@/hooks/useRealtimeRows';
import { toast } from '@/components/ui/toast';
import {
  createInventoryItem,
  updateInventoryItem,
  updateQuantity,
  deleteInventoryItem,
} from './inventory.api';
import { addShoppingItem } from '@/modules/shopping/shopping.api';
import type { InventoryItem, InventoryFormData } from './inventory.types';
import InventoryFormSheet from './InventoryFormSheet';

export default function InventoryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Realtime subscription (E1)
  const { rows: items, isLoading } = useRealtimeRows<InventoryItem>({
    table: 'inventory_items',
    orderBy: { column: 'category', ascending: true },
  });

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of filtered) {
      const cat = item.category || 'genel';
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return map;
  }, [filtered]);

  // Low-stock items
  const lowStockItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.low_threshold != null && item.quantity <= item.low_threshold,
      ),
    [items],
  );

  // Initialize all categories as expanded
  useMemo(() => {
    if (expandedCategories.size === 0 && grouped.size > 0) {
      setExpandedCategories(new Set(grouped.keys()));
    }
  }, [grouped, expandedCategories.size]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // Handlers
  const handleQuantityChange = useCallback(
    async (item: InventoryItem, delta: number) => {
      try {
        await updateQuantity(item.id, item.quantity + delta);
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    },
    [t],
  );

  const handleAddToShopping = useCallback(
    async (item: InventoryItem) => {
      try {
        await addShoppingItem({
          name: item.name,
          quantity: 1,
          unit: item.unit,
          category: item.category,
          note: null,
        });
        toast({ title: t('inventory.toast.addedToShopping'), variant: 'success' });
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    },
    [t],
  );

  const handleCreate = useCallback(
    async (data: InventoryFormData) => {
      await createInventoryItem(data);
      toast({ title: t('inventory.toast.created'), variant: 'success' });
    },
    [t],
  );

  const handleUpdate = useCallback(
    async (data: InventoryFormData) => {
      if (!editItem) return;
      await updateInventoryItem(editItem.id, data);
      toast({ title: t('inventory.toast.updated'), variant: 'success' });
      setEditItem(null);
    },
    [editItem, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteInventoryItem(id);
        toast({ title: t('inventory.toast.deleted'), variant: 'success' });
        setMenuOpenId(null);
      } catch {
        toast({ title: t('common.error'), variant: 'error' });
      }
    },
    [t],
  );

  const handleEditClick = useCallback((item: InventoryItem) => {
    setEditItem(item);
    setFormOpen(true);
    setMenuOpenId(null);
  }, []);

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
        <h1 className="text-xl font-bold">{t('inventory.title')}</h1>
        <Button
          size="icon"
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="pl-9"
        />
      </div>

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('inventory.lowStockBanner', { count: lowStockItems.length })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddToShopping(item)}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800 transition-colors hover:bg-orange-200 active:scale-95"
              >
                <ShoppingCart className="h-3 w-3" />
                {item.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title={t('inventory.empty.title')}
          description={t('inventory.empty.description')}
        />
      )}

      {/* Category groups */}
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <div key={category} className="space-y-2">
          {/* Category header */}
          <button
            onClick={() => toggleCategory(category)}
            className="flex w-full items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {expandedCategories.has(category) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="capitalize">{t(`inventory.categories.${category}`, category)}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {categoryItems.length}
            </span>
          </button>

          {/* Items */}
          {expandedCategories.has(category) && (
            <div className="space-y-2 pl-1">
              {categoryItems.map((item) => {
                const isLow =
                  item.low_threshold != null && item.quantity <= item.low_threshold;

                return (
                  <Card
                    key={item.id}
                    className={`flex items-center gap-3 p-3 ${isLow ? 'border-orange-300 bg-orange-50/50' : ''}`}
                  >
                    {/* Name + unit */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {item.name}
                        </span>
                        {isLow && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.unit}
                        {item.note && ` · ${item.note}`}
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item, -1)}
                        disabled={item.quantity <= 0}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Add to shopping (if low) */}
                    {isLow && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-orange-600"
                        onClick={() => handleAddToShopping(item)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === item.id ? null : item.id)
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {menuOpenId === item.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border bg-background p-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => handleEditClick(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('common.edit')}
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Form sheet */}
      <InventoryFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        onSubmit={editItem ? handleUpdate : handleCreate}
        editItem={editItem}
      />
    </div>
  );
}
