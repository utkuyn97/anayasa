/**
 * useUsers.ts — Fetch the two household users from allowed_users.
 * Cached in state, re-used across components (reassign dialog, avatars, etc.).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface HouseholdUser {
  id: string;
  email: string;
  display_name: string;
  color_hex: string;
  role: 'owner' | 'partner';
}

let _cachedUsers: HouseholdUser[] | null = null;

export function useUsers() {
  const [users, setUsers] = useState<HouseholdUser[]>(_cachedUsers ?? []);
  const [isLoading, setIsLoading] = useState(!_cachedUsers);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('id, email, display_name, color_hex, role')
        .order('role', { ascending: true });

      if (error) throw error;
      const fetched = (data ?? []) as HouseholdUser[];
      _cachedUsers = fetched;
      setUsers(fetched);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!_cachedUsers) {
      fetchUsers();
    }
  }, [fetchUsers]);

  /** Get the partner (other user) given current user id */
  const getPartner = useCallback(
    (myId: string): HouseholdUser | undefined =>
      users.find((u) => u.id !== myId),
    [users],
  );

  /** Get user by id */
  const getUserById = useCallback(
    (id: string): HouseholdUser | undefined =>
      users.find((u) => u.id === id),
    [users],
  );

  return { users, isLoading, getPartner, getUserById, refetch: fetchUsers };
}
