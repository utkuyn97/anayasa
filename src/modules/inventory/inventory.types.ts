/**
 * inventory.types.ts — TypeScript types for inventory module.
 * Matches schema.sql → inventory_items table.
 */

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  low_threshold: number | null;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

export interface InventoryFormData {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  low_threshold: number | null;
  note: string | null;
}
