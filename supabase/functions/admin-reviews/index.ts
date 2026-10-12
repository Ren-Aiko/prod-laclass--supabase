// =====================================================================
// Function: admin-reviews
// Path: /supabase/functions/admin-reviews/index.ts
// Methods: GET, PATCH, DELETE
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

    // GET /admin-reviews
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500, error);
      return jsonResponse(data || []);
    }

    // PATCH /admin-reviews (Toggle review approval)
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || url.searchParams.get('id') || '').trim();
      const approved = Boolean(body.approved);

      if (!id) return errorResponse('Review ID is required.', 400);

      const { data, error } = await supabase
        .from('reviews')
        .update({ approved })
        .eq('id', id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 400, error);

      // Re-aggregate product rating & review_count
      if (data?.product_id) {
        const { data: approvedList } = await supabase
          .from('reviews')
          .select('rating')
          .eq('product_id', data.product_id)
          .eq('approved', true);

        const count = approvedList?.length || 0;
        const avg = count > 0
          ? Number((approvedList!.reduce((acc, r) => acc + (r.rating || 5), 0) / count).toFixed(2))
          : 5.0;

        await supabase
          .from('products')
          .update({ rating: avg, review_count: count })
          .eq('product_id', data.product_id);
      }

      return jsonResponse({ success: true, updated: data });
    }

    // DELETE /admin-reviews?id=<id>
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      if (!id) return errorResponse('Review ID parameter is required.', 400);

      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) return errorResponse(error.message, 400, error);
      return jsonResponse({ success: true, deleted_id: id });
    }

    return errorResponse('Method Not Allowed', 405);
  } catch (err: any) {
    console.error('[admin-reviews Exception]:', err);
    return errorResponse(err.message || 'Unauthorized / Server Error', err.message?.includes('Access denied') ? 403 : 500);
  }
});
