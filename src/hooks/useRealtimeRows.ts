/**
 * useRealtimeRows.ts — Generic Supabase Realtime subscription hook.
 *
 * Usage:
 *   const { rows, isLoading } = useRealtimeRows<ChoreInstance>({
 *     table: 'chore_instances',
 *     select: '*, chore:chores!chore_id(title, ...)',
 *     filter: { column: 'status', value: 'pending' },
 *     orderBy: { column: 'due_at', ascending: true },
 *   });
 *
 * D-0010: Only use on household tables. Personal tables don't need realtime.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeRowsOptions {
  /** Postgres table name */
  table: string;
  /** Supabase select expression (can include joins) */
  select?: string;
  /** Simple equality filter */
  filter?: {
    column: string;
    value: string | number | boolean;
  };
  /** Order by */
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  /** Whether to subscribe to realtime changes (default: true) */
  realtime?: boolean;
  /** Disable fetching (useful for conditional queries) */
  enabled?: boolean;
}

interface UseRealtimeRowsResult<T> {
  rows: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealtimeRows<T = Record<string, unknown>>(
  options: UseRealtimeRowsOptions,
): UseRealtimeRowsResult<T> {
  const {
    table,
    select = '*',
    filter,
    orderBy,
    realtime = true,
    enabled = true,
  } = options;

  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      let query = supabase.from(table).select(select);

      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      if (orderBy) {
        query = query.order(orderBy.column, {
          ascending: orderBy.ascending ?? true,
        });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setRows((data ?? []) as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [table, select, filter?.column, filter?.value, orderBy?.column, orderBy?.ascending, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !enabled) return;

    const channel = supabase
      .channel(`${table}_realtime_${filter?.column ?? 'all'}_${filter?.value ?? ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        () => {
          // Refetch on any change — simpler and more reliable than manual patching
          fetchData();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter?.column, filter?.value, realtime, enabled, fetchData]);

  return { rows, isLoading, error, refetch: fetchData };
}
