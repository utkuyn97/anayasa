/**
 * shopping.types.ts — TypeScript types for shopping module.
 * Matches schema.sql → shopping_items table.
 */

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  note: string | null;
  added_by: string;
  added_at: string;
  purchased: boolean;
  purchased_at: string | null;
  purchased_by: string | null;
  archived_at: string | null;
}

export interface ShoppingFormData {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  note: string | null;
}

export interface FrequentItem {
  name: string;
  count: number;
  unit: string;
  category: string;
}
