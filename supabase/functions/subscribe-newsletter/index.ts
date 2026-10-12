// =====================================================================
// Function: subscribe-newsletter
// Path: /supabase/functions/subscribe-newsletter/index.ts
// Method: POST
// Standalone file — Ready to paste directly into Supabase Dashboard Web Editor
// =====================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sfqnaftcpuoyftpjgxbb.supabase.co';

  let secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey && Deno.env.get('SUPABASE_SECRET_KEYS')) {
    try {
      const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!);
      secretKey = keys['default'] || Object.values(keys)[0] as string;
    } catch {}
  }
  if (!secretKey) {
    secretKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, secretKey || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 405);
  }

  try {
    const supabase = getServiceClient();
    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body.email || '').trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      return errorResponse('Please provide a valid email address.', 400);
    }

    // Check if email already exists in subscribers table
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('email', rawEmail)
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        success: true,
        alreadySubscribed: true,
        couponCode: 'WELCOME10',
        message: 'You are already subscribed to the LaClassé VIP Atelier! Use promo code WELCOME10 for 10% off.',
      });
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('subscribers')
      .insert({ email: rawEmail });

    if (insertError) {
      console.error('[subscribe-newsletter Insert Error]:', insertError);
      return errorResponse(insertError.message || 'Unable to record subscription.', 400, insertError);
    }

    return jsonResponse({
      success: true,
      alreadySubscribed: false,
      couponCode: 'WELCOME10',
      message: 'Thank you for joining our Privé Circle! Use promo code WELCOME10 for 10% off your first order.',
    }, 201);
  } catch (err: any) {
    console.error('[subscribe-newsletter Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
