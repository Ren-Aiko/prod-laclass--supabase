// =====================================================================
// Function: release-expired-reservations
// Path: /supabase/functions/release-expired-reservations/index.ts
// Methods: POST, GET
// Standalone file — Ready to paste directly into Supabase Dashboard Web Editor
// =====================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization') || '';
    const incomingSecret = req.headers.get('x-cron-secret');

    let isAuthorized = false;

    if (cronSecret && incomingSecret === cronSecret) {
      isAuthorized = true;
    }

    const supabase = getServiceClient();

    if (!isAuthorized && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: admin } = await supabase
          .from('admins')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .single();

        if (admin) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return errorResponse('Unauthorized: Valid Admin JWT or CRON_SECRET header required.', 401);
    }

    // Call PostgreSQL RPC to release expired unpaid orders
    const { data: result, error: rpcError } = await supabase.rpc('release_expired_reservations');

    if (rpcError) {
      console.error('[release_expired_reservations RPC Error]:', rpcError);
      return errorResponse(rpcError.message, 500, rpcError);
    }

    return jsonResponse({
      success: true,
      released_count: result?.released_count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[release-expired-reservations Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
