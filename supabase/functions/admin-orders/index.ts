// =====================================================================
// Function: admin-orders
// Path: /supabase/functions/admin-orders/index.ts
// Methods: GET, PATCH, POST
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

    // GET /admin-orders
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500, error);
      return jsonResponse(data || []);
    }

    // PATCH /admin-orders (Status transition or courier dispatch)
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || body.order_id || '').trim();
      const status = String(body.status || body.payment_status || '').trim();
      const courierName = body.courier_name || null;
      const trackingNumber = body.tracking_number || null;

      if (!id || !status) {
        return errorResponse('Order ID and new Status are required.', 400);
      }

      // If transitioning to "Payment Confirmed", execute PostgreSQL confirm_order_payment RPC
      if (status === 'Payment Confirmed') {
        const { data: confirmedOrder, error: confError } = await supabase.rpc('confirm_order_payment', {
          p_order_id: id,
        });

        if (confError) {
          console.error('[confirm_order_payment RPC Error]:', confError);
          return errorResponse(confError.message, 400, confError);
        }

        return jsonResponse({ success: true, updated: confirmedOrder });
      }

      // Other status updates (e.g. Shipped, Delivered, Cancelled)
      const updateData: Record<string, any> = {
        payment_status: status,
      };

      if (courierName) updateData.courier_name = courierName;
      if (trackingNumber) updateData.tracking_number = trackingNumber;

      const { data: updatedOrder, error: upError } = await supabase
        .from('orders')
        .update(updateData)
        .or(`id.eq.${id},order_number.eq.${id}`)
        .select()
        .single();

      if (upError) return errorResponse(upError.message, 400, upError);
      return jsonResponse({ success: true, updated: updatedOrder });
    }

    // POST /admin-orders (Explicit restock for cancelled paid orders)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const orderId = String(body.order_id || body.id || '').trim();
      const action = String(body.action || '').trim();

      if (action === 'restock' && orderId) {
        const { data: restocked, error: restockErr } = await supabase.rpc('restock_order_explicit', {
          p_order_id: orderId,
        });

        if (restockErr) {
          console.error('[restock_order_explicit RPC Error]:', restockErr);
          return errorResponse(restockErr.message, 400, restockErr);
        }

        return jsonResponse({ success: true, restocked: true, order: restocked });
      }

      return errorResponse('Unrecognized action for POST /admin-orders.', 400);
    }

    return errorResponse('Method Not Allowed', 405);
  } catch (err: any) {
    console.error('[admin-orders Exception]:', err);
    return errorResponse(err.message || 'Unauthorized / Server Error', err.message?.includes('Access denied') ? 403 : 500);
  }
});
