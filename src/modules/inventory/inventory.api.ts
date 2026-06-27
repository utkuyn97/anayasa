/**
 * inventory.api.ts — Supabase CRUD for inventory_items.
 * RLS: household policy (both users can read/write all items).
 */
import { supabase } from '@/lib/supabase';
import type { InventoryItem, InventoryFormData } from './inventory.types';

/** List all inventory items ordered by category + name. */
export async function listInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as InventoryItem[];
}

/** Create a new inventory item. */
export async function createInventoryItem(
  form: InventoryFormData,
): Promise<InventoryItem> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      name: form.name,
      quantity: form.quantity,
      unit: form.unit,
      category: form.category,
      low_threshold: form.low_threshold,
      note: form.note,
      updated_by: userData.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

/** Update an inventory item. */
export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryFormData>,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('inventory_items')
    .update({
      ...updates,
      updated_by: userData.user.id,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Update only the quantity of an item (+/- buttons). */
export async function updateQuantity(
  id: string,
  newQuantity: number,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('inventory_items')
    .update({
      quantity: Math.max(0, newQuantity),
      updated_by: userData.user.id,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Delete an inventory item permanently. */
export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
