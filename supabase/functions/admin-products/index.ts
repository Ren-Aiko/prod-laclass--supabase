// =====================================================================
// Function: admin-products
// Path: /supabase/functions/admin-products/index.ts
// Methods: GET, POST, PATCH, DELETE
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

    // GET /admin-products
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_id', { ascending: true })
        .order('size', { ascending: true });

      if (error) return errorResponse(error.message, 500, error);
      return jsonResponse(data || []);
    }

    // POST /admin-products (Create or Update Product and its variants)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const pId = String(body.productId || body.product_id || '').trim();
      const name = String(body.name || '').trim();
      const category = String(body.category || 'Luxury').trim();
      const fabric = String(body.fabric || 'Dubai Nida').trim();
      const price = Number(body.price || 0);
      const originalPrice = body.originalPrice != null ? Number(body.originalPrice) : null;
      const description = String(body.description || '').trim();
      const collection = String(body.collection || 'Luxury Signature').trim();
      const badge = body.badge || null;
      const isFeatured = Boolean(body.featured || body.is_featured);
      const isNewArrival = Boolean(body.newArrival || body.is_new_arrival);

      const image1 = body.image1 || null;
      const image2 = body.image2 || null;
      const image3 = body.image3 || null;

      if (!pId || !name || price <= 0) {
        return errorResponse('Product Code (ID), Name, and Price are required.', 400);
      }

      // Generate server-side slug
      const slug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) + `-${pId.toLowerCase()}`;

      const variants = Array.isArray(body.variants) && body.variants.length > 0
        ? body.variants
        : [{ size: body.size || 'Free Size', length: body.length || '56"', quantity: Number(body.quantity || 1) }];

      const upsertRows = variants.map((v: any) => ({
        id: v.id || `prod_${pId.toLowerCase()}_${(v.size || 'fs').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(v.length || '56').replace(/[^0-9]/g, '')}`,
        product_id: pId,
        name,
        slug,
        category,
        fabric,
        price,
        original_price: originalPrice,
        description,
        collection,
        badge,
        size: v.size || 'Free Size',
        length: v.length || '56"',
        quantity: Math.max(0, Number(v.quantity || 0)),
        image1,
        image2,
        image3,
        thumbnail: image1,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_active: true,
      }));

      const { data: savedRows, error: upsertError } = await supabase
        .from('products')
        .upsert(upsertRows, { onConflict: 'id' })
        .select();

      if (upsertError) {
        console.error('[admin-products Upsert Error]:', upsertError);
        return errorResponse(upsertError.message, 400, upsertError);
      }

      // Propagate shared images across other variants with this product_id
      if (image1 || image2 || image3) {
        await supabase
          .from('products')
          .update({ image1, image2, image3, thumbnail: image1 })
          .eq('product_id', pId);
      }

      return jsonResponse({ success: true, variants: savedRows }, 200);
    }

    // PATCH /admin-products?id=<id> (Stock update)
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || url.searchParams.get('id') || '').trim();
      const quantity = Math.max(0, Number(body.quantity || 0));

      if (!id) return errorResponse('Variant ID is required.', 400);

      const { data, error } = await supabase
        .from('products')
        .update({ quantity })
        .eq('id', id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 400, error);
      return jsonResponse({ success: true, updated: data });
    }

    // DELETE /admin-products?id=<id>&is_group=<bool>
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      const isGroup = url.searchParams.get('is_group') === 'true';

      if (!id) return errorResponse('ID parameter is required.', 400);

      if (isGroup) {
        const { error } = await supabase.from('products').delete().eq('product_id', id);
        if (error) return errorResponse(error.message, 400, error);
      } else {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) return errorResponse(error.message, 400, error);
      }

      return jsonResponse({ success: true, deleted_id: id });
    }

    return errorResponse('Method Not Allowed', 405);
  } catch (err: any) {
    console.error('[admin-products Exception]:', err);
    return errorResponse(err.message || 'Unauthorized / Server Error', err.message?.includes('Access denied') ? 403 : 500);
  }
});
