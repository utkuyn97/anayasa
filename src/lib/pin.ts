import { supabase } from './supabase';

/** Device fingerprint: simple hash of browser properties (not crypto-grade, just identification). */
export function getDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
  ].join('|');

  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export interface PinCheckResult {
  success: boolean;
  locked: boolean;
  lockedUntil?: string;
  remainingAttempts?: number;
  error?: string;
}

/**
 * Verify PIN via the verify-pin Edge Function (bcrypt server-side, with lockout).
 * There is deliberately NO client-side fallback: comparing a PIN hash in the browser
 * would be bypassable, and it would require the frontend to write its own lockout
 * counters (failed_attempts / locked_until) — letting an attacker reset them. If the
 * function is unreachable, we fail closed.
 */
export async function verifyPin(pin: string): Promise<PinCheckResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { success: false, locked: false, error: 'No session' };

  try {
    const { data, error } = await supabase.functions.invoke('verify-pin', {
      body: {
        pin,
        deviceFingerprint: getDeviceFingerprint(),
      },
    });

    if (error || !data) {
      return { success: false, locked: false, error: 'PIN service unavailable' };
    }

    return {
      success: data.success ?? false,
      locked: data.locked ?? false,
      lockedUntil: data.lockedUntil,
      remainingAttempts: data.remainingAttempts,
      error: data.error,
    };
  } catch {
    return { success: false, locked: false, error: 'PIN service unavailable' };
  }
}

/** Check if device is remembered (PIN not required). */
export async function checkDeviceRemembered(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_pins')
    .select('remember_device_until, device_fingerprint')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return false;

  const now = new Date();
  const until = data.remember_device_until
    ? new Date(data.remember_device_until)
    : null;
  const fp = data.device_fingerprint;

  return (
    until !== null &&
    until > now &&
    fp === getDeviceFingerprint()
  );
}

/** Check if user has a PIN set. */
export async function hasPinSet(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_pins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return data !== null;
}

export interface SetPinResult {
  success: boolean;
  error?: string;
}

/**
 * Set the initial PIN via the verify-pin Edge Function (bcrypt server-side).
 * No client-side fallback — fails closed if the function is unreachable.
 */
export async function setPin(pin: string): Promise<SetPinResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  // Check if already set
  const existing = await hasPinSet();
  if (existing) return { success: false, error: 'PIN already set' };

  // Try Edge Function first (production path — bcrypt)
  try {
    const { data, error } = await supabase.functions.invoke('verify-pin', {
      body: {
        pin,
        deviceFingerprint: getDeviceFingerprint(),
        action: 'set',
      },
    });

    if (!error && data?.success) {
      return { success: true };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: false, error: error?.message ?? 'PIN service unavailable' };
  } catch {
    return { success: false, error: 'PIN service unavailable' };
  }
}
