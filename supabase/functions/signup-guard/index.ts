/**
 * signup-guard — Supabase Edge Function.
 * Auth hook: checks if new signup email is in allowed_users whitelist.
 * If not → reject signup.
 *
 * Configure as Auth Hook in Supabase Dashboard:
 *   Authentication → Hooks → "Before Sign Up" → point to this function.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();

    // Auth hook payload structure
    const email = payload?.record?.email ?? payload?.email;

    if (!email) {
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'No email provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Check whitelist
    const { data, error } = await supabase
      .from('allowed_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('Whitelist check error:', error);
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'Internal error during whitelist check',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!data) {
      console.warn(`Signup rejected: ${email} not in whitelist`);
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'This email is not authorized to sign up.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Allowed
    return new Response(
      JSON.stringify({ decision: 'continue' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('signup-guard error:', error);
    return new Response(
      JSON.stringify({
        decision: 'reject',
        message: 'Internal error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
