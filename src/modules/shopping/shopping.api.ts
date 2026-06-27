/**
 * shopping.api.ts — Supabase CRUD for shopping_items.
 * RLS: household policy (both users can read/write).
 */
import { supabase } from '@/lib/supabase';
import type { ShoppingItem, ShoppingFormData, FrequentItem } from './shopping.types';

/** List active (non-archived) shopping items, newest first. */
export async function listShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .is('archived_at', null)
    .order('purchased', { ascending: true })
    .order('added_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShoppingItem[];
}

/** Add a new shopping item. */
export async function addShoppingItem(
  form: ShoppingFormData,
): Promise<ShoppingItem> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      name: form.name,
      quantity: form.quantity,
      unit: form.unit,
      category: form.category,
      note: form.note,
      added_by: userData.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ShoppingItem;
}

/** Mark an item as purchased. */
export async function markPurchased(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('shopping_items')
    .update({
      purchased: true,
      purchased_at: new Date().toISOString(),
      purchased_by: userData.user.id,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Undo purchase — set back to active. */
export async function undoPurchase(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .update({
      purchased: false,
      purchased_at: null,
      purchased_by: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Archive all purchased items (set archived_at). */
export async function archivePurchased(): Promise<number> {
  const { data, error } = await supabase
    .from('shopping_items')
    .update({ archived_at: new Date().toISOString() })
    .eq('purchased', true)
    .is('archived_at', null)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

/** Delete a shopping item permanently. */
export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get frequently added items from the last N days.
 * Returns items added 2+ times, sorted by frequency.
 */
export async function getFrequentItems(days: number = 30): Promise<FrequentItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('shopping_items')
    .select('name, unit, category')
    .gte('added_at', since.toISOString());

  if (error) throw error;

  // Count occurrences client-side (Supabase doesn't support GROUP BY + COUNT easily)
  const countMap = new Map<string, FrequentItem>();
  for (const item of data ?? []) {
    const key = item.name.toLowerCase().trim();
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, {
        name: item.name,
        count: 1,
        unit: item.unit,
        category: item.category,
      });
    }
  }

  return Array.from(countMap.values())
    .filter((i) => i.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
