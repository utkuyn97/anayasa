import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Sign in with email + password (Supabase Auth). */
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/** Sign out — clears JWT & session. */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get current session (null if not logged in). */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Get current user from session. */
export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Check if user is in allowed_users whitelist. */
export async function isAllowedUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Whitelist check failed:', error);
    return false;
  }
  return data !== null;
}
