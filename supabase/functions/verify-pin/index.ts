/**
 * verify-pin — Supabase Edge Function.
 * Handles PIN verification and initial PIN setup.
 *
 * POST body:
 *   { pin: string, deviceFingerprint: string, action?: 'set' }
 *
 * Uses bcrypt for hashing (cost 12).
 * Rate limit: 10 requests/minute per user (in-memory).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const BCRYPT_COST = 12;
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const REMEMBER_DAYS = 7;

// Simple in-memory rate limit (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create client with user's JWT for auth, service_role for DB writes
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { pin, deviceFingerprint, action } = body as {
      pin: string;
      deviceFingerprint?: string;
      action?: string;
    };

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PIN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Service role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // === SET PIN (first-time setup) ===
    if (action === 'set') {
      // Check if PIN already exists
      const { data: existing } = await supabaseAdmin
        .from('user_pins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: false, error: 'PIN already set' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const pinHash = await bcrypt.hash(pin, BCRYPT_COST);

      const { error: insertError } = await supabaseAdmin
        .from('user_pins')
        .insert({
          user_id: user.id,
          pin_hash: pinHash,
          device_fingerprint: deviceFingerprint ?? null,
          remember_device_until: new Date(
            Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // === VERIFY PIN ===
    const { data: pinData } = await supabaseAdmin
      .from('user_pins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!pinData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No PIN set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check lock
    if (
      pinData.locked_until &&
      new Date(pinData.locked_until) > new Date()
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          locked: true,
          lockedUntil: pinData.locked_until,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Compare PIN
    const isValid = await bcrypt.compare(pin, pinData.pin_hash);

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

      await supabaseAdmin
        .from('user_pins')
        .update(updateData)
        .eq('user_id', user.id);

      if (newAttempts >= MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({
            success: false,
            locked: true,
            lockedUntil: updateData.locked_until,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          locked: false,
          remainingAttempts: MAX_ATTEMPTS - newAttempts,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // PIN correct — reset attempts, optionally remember device
    const updateData: Record<string, unknown> = {
      failed_attempts: 0,
      locked_until: null,
    };

    if (deviceFingerprint) {
      updateData.device_fingerprint = deviceFingerprint;
      updateData.remember_device_until = new Date(
        Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    await supabaseAdmin
      .from('user_pins')
      .update(updateData)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('verify-pin error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
