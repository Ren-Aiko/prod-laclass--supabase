// =====================================================================
// Function: admin-coupons
// Path: /supabase/functions/admin-coupons/index.ts
// Methods: GET, POST, DELETE
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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = getServiceClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw new Error('Invalid or expired authentication session');
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('id, auth_user_id, email, role, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single();

  if (adminError || !adminRecord) {
    throw new Error('Access denied: User is not an active administrator');
  }

  return { user, admin: adminRecord };
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
    const supabase = getServiceClient();
    const url = new URL(req.url);

    // GET /admin-coupons
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500, error);
      return jsonResponse(data || []);
    }

    // POST /admin-coupons (Create or edit coupon)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const code = String(body.code || '').trim().toUpperCase();
      const discountType = body.discountType || body.discount_type || 'percentage';
      const discountValue = Number(body.discountValue ?? body.discount_value ?? 0);
      const minPurchase = Number(body.minPurchase ?? body.min_purchase ?? 0);
      const expiryDate = body.expiryDate || body.expiry_date || '2026-12-31';
      const active = body.active !== undefined ? Boolean(body.active) : true;

      if (!code || discountValue <= 0) {
        return errorResponse('Coupon code and positive discount value are required.', 400);
      }

      const { data, error } = await supabase
        .from('coupons')
        .upsert({
          code,
          discount_type: discountType,
          discount_value: discountValue,
          min_purchase: minPurchase,
          expiry_date: expiryDate,
          active,
        }, { onConflict: 'code' })
        .select()
        .single();

      if (error) return errorResponse(error.message, 400, error);
      return jsonResponse({ success: true, coupon: data }, 201);
    }

    // DELETE /admin-coupons?code=<code>
    if (req.method === 'DELETE') {
      const code = (url.searchParams.get('code') || '').trim().toUpperCase();
      if (!code) return errorResponse('Coupon code query parameter is required.', 400);

      const { error } = await supabase.from('coupons').delete().eq('code', code);
      if (error) return errorResponse(error.message, 400, error);
      return jsonResponse({ success: true, deleted: code });
    }

    return errorResponse('Method Not Allowed', 405);
  } catch (err: any) {
    console.error('[admin-coupons Exception]:', err);
    return errorResponse(err.message || 'Unauthorized / Server Error', err.message?.includes('Access denied') ? 403 : 500);
  }
});
