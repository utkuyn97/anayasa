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

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Verify PIN via Edge Function (bcrypt server-side).
 * Falls back to direct DB comparison ONLY if Edge Function is not yet deployed.
 * The fallback uses the same hash format as setPin's fallback.
 */
export async function verifyPin(pin: string): Promise<PinCheckResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { success: false, locked: false, error: 'No session' };

  // Try Edge Function first (production path — bcrypt)
  try {
    const { data, error } = await supabase.functions.invoke('verify-pin', {
      body: {
        pin,
        deviceFingerprint: getDeviceFingerprint(),
      },
    });

    if (!error && data) {
      return {
        success: data.success ?? false,
        locked: data.locked ?? false,
        lockedUntil: data.lockedUntil,
        remainingAttempts: data.remainingAttempts,
        error: data.error,
      };
    }

    // Edge Function not deployed or network error → fall through to fallback
    console.warn('Edge Function verify-pin unavailable, using fallback:', error?.message);
  } catch {
    console.warn('Edge Function verify-pin call failed, using fallback');
  }

  // === FALLBACK: Direct DB comparison (pre-deployment) ===
  return verifyPinFallback(pin, session.user.id);
}

/** Fallback PIN verification — direct DB with SHA-256. Only used when Edge Function is not deployed. */
async function verifyPinFallback(pin: string, userId: string): Promise<PinCheckResult> {
  const { data: pinData } = await supabase
    .from('user_pins')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!pinData) return { success: false, locked: false };

  // Check lock
  if (pinData.locked_until && new Date(pinData.locked_until) > new Date()) {
    return {
      success: false,
      locked: true,
      lockedUntil: pinData.locked_until,
    };
  }

  const inputHash = await simplePinHash(pin);
  const isValid = inputHash === pinData.pin_hash;

  if (!isValid) {
    const newAttempts = (pinData.failed_attempts ?? 0) + 1;
    const updateData: Record<string, unknown> = {
      failed_attempts: newAttempts,
    };

    if (newAttempts >= MAX_ATTEMPTS) {
      updateData.locked_until = new Date(
        Date.now() + LOCK_DURATION_MS,
      ).toISOString();
    }

    await supabase
      .from('user_pins')
      .update(updateData)
      .eq('user_id', userId);

    if (newAttempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        locked: true,
        lockedUntil: updateData.locked_until as string,
      };
    }

    return {
      success: false,
      locked: false,
      remainingAttempts: MAX_ATTEMPTS - newAttempts,
    };
  }

  // Success — reset attempts, remember device
  await supabase
    .from('user_pins')
    .update({
      failed_attempts: 0,
      locked_until: null,
      device_fingerprint: getDeviceFingerprint(),
      remember_device_until: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .eq('user_id', userId);

  return { success: true, locked: false };
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
 * Set initial PIN via Edge Function (bcrypt server-side).
 * Falls back to direct DB insert with SHA-256 if Edge Function is not deployed.
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

    // Edge Function not deployed → fall through to fallback
    console.warn('Edge Function verify-pin (set) unavailable, using fallback:', error?.message);
  } catch {
    console.warn('Edge Function verify-pin (set) call failed, using fallback');
  }

  // === FALLBACK: Direct DB insert with SHA-256 (pre-deployment) ===
  return setPinFallback(pin, session.user.id);
}

/** Fallback PIN set — direct DB with SHA-256. Only used when Edge Function is not deployed. */
async function setPinFallback(pin: string, userId: string): Promise<SetPinResult> {
  const pinHash = await simplePinHash(pin);

  const { error } = await supabase.from('user_pins').insert({
    user_id: userId,
    pin_hash: pinHash,
    device_fingerprint: getDeviceFingerprint(),
    remember_device_until: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });

  if (error) {
    console.error('PIN set error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * SHA-256 hash for fallback mode (pre-Edge Function deployment).
 * NOT production-grade — replaced by bcrypt when Edge Function is deployed.
 * Edge Function will automatically be preferred when available.
 */
async function simplePinHash(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_anayasa_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
