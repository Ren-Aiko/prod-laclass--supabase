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
      const price = Number(body.price);
      const rawOriginalPrice = body.originalPrice ?? body.original_price;
      const originalPrice = rawOriginalPrice == null || rawOriginalPrice === '' ? null : Number(rawOriginalPrice);
      const description = String(body.description || '').trim();
      const collection = String(body.collection || 'Luxury Signature').trim();
      const toBoolean = (value: unknown, fallback: boolean): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
        return fallback;
      };
      const isFeatured = toBoolean(body.featured ?? body.is_featured, false);
      const isNewArrival = toBoolean(body.newArrival ?? body.is_new_arrival, false);
      const isFlashSale = toBoolean(body.flashSale ?? body.is_flash_sale, false);
      const isActive = toBoolean(body.active ?? body.is_active, true);
      const isNewProduct = body.isNewProduct === true;

      if (!pId || pId.length > 100 || !name || !Number.isFinite(price) || price <= 0) {
        return errorResponse('Product ID, name, and a valid price greater than zero are required.', 400);
      }
      if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
        return errorResponse('Original price must be zero or a positive number.', 400);
      }

      if (!Array.isArray(body.variants) || body.variants.length === 0) {
        return errorResponse('At least one size/length variant is required.', 400);
      }

      const allowedSizes = new Set(['L', 'XL', 'XXL', 'FREE SIZE', 'CUSTOM']);
      const allowedLengths = new Set(['52"', '54"', '56"', '58"', '60"']);
      const variantKeys = new Set<string>();
      const variants: { size: string; length: string | null; quantity: number }[] = [];

      for (const variant of body.variants) {
        const rawSize = String(variant?.size || '').trim().toUpperCase();
        const size = rawSize === '2XL' ? 'XXL' : rawSize === 'FREESIZE' ? 'FREE SIZE' : rawSize;
        const canonicalSize = size === 'FREE SIZE' ? 'Free Size' : size === 'CUSTOM' ? 'Custom' : size;
        const rawLength = String(variant?.length || '').trim().replace(/[”]/g, '"');
        const length = rawLength ? (rawLength.endsWith('"') ? rawLength : `${rawLength}"`) : null;
        const quantity = Number(variant?.quantity);

        if (!allowedSizes.has(size)) {
          return errorResponse(`Unsupported garment size: ${String(variant?.size || '')}.`, 400);
        }
        if (length && !allowedLengths.has(length)) {
          return errorResponse(`Unsupported garment length: ${length}.`, 400);
        }
        if (!Number.isInteger(quantity) || quantity < 0) {
          return errorResponse('Variant stock must be a non-negative whole number.', 400);
        }

        const variantKey = `${canonicalSize}|${length || ''}`;
        if (variantKeys.has(variantKey)) {
          return errorResponse(`Duplicate size/length variant: ${canonicalSize} ${length || ''}.`, 400);
        }
        variantKeys.add(variantKey);
        variants.push({ size: canonicalSize, length, quantity });
      }

      const { count, error: existingError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', pId);
      if (existingError) return errorResponse(existingError.message, 400, existingError);
      if (isNewProduct && (count || 0) > 0) {
        return errorResponse('That Product ID is already in use. Choose a different ID.', 409);
      }
      if (!isNewProduct && count === 0) {
        return errorResponse('This garment no longer exists. Refresh the product list and try again.', 404);
      }

      const submittedSlug = String(body.slug || '').trim();
      const slugBase = String(submittedSlug || name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = submittedSlug
        ? slugBase
        : slugBase
          ? `${slugBase}-${pId.toLowerCase()}`
          : pId.toLowerCase();
      const productPayload = {
        product_id: pId,
        name,
        slug,
        category,
        collection,
        description,
        fabric,
        price,
        original_price: originalPrice,
        image1: body.image1 || null,
        image2: body.image2 || null,
        image3: body.image3 || null,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_flash_sale: isFlashSale,
        is_active: isActive,
      };

      const { data: savedRows, error: saveError } = await supabase.rpc('admin_save_product', {
        p_product: productPayload,
        p_variants: variants,
        p_is_new: isNewProduct,
      });
      if (saveError) {
        console.error('[admin-products Save Error]:', saveError);
        if (saveError.code === 'PGRST202') {
          return errorResponse('The product management migration is not installed. Run supabase/10_product_variant_management.sql.', 503, saveError);
        }
        if (saveError.code === '23505') return errorResponse('That Product ID is already in use.', 409, saveError);
        if (saveError.code === 'P0002') return errorResponse('This garment no longer exists. Refresh the product list and try again.', 404, saveError);
        return errorResponse(saveError.message, 400, saveError);
      }

      return jsonResponse({ success: true, variants: savedRows }, 200);
    }

    // PATCH /admin-products?id=<id> (Stock update)
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || url.searchParams.get('id') || '').trim();
      const quantity = Number(body.quantity);

      if (!id) return errorResponse('Variant ID is required.', 400);
      if (!Number.isInteger(quantity) || quantity < 0) {
        return errorResponse('Variant stock must be a non-negative whole number.', 400);
      }

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
      const isGroup = url.searchParams.get('group') === 'true'
        || url.searchParams.get('is_group') === 'true';

      if (!id) return errorResponse('ID parameter is required.', 400);

      if (isGroup) {
        const { data: deletedCount, error } = await supabase.rpc('admin_delete_product', {
          p_product_id: id,
        });
        if (error) return errorResponse(error.message, error.code === 'PGRST202' ? 503 : 400, error);
        if (!deletedCount) return errorResponse('No matching garment was found to delete.', 404);
      } else {
        const { data: deletedRows, error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .select('id');
        if (error) return errorResponse(error.message, 400, error);
        if (!deletedRows?.length) return errorResponse('No matching product variant was found to delete.', 404);
      }

      return jsonResponse({ success: true, deleted_id: id });
    }

    return errorResponse('Method Not Allowed', 405);
  } catch (err: any) {
    console.error('[admin-products Exception]:', err);
    return errorResponse(err.message || 'Unauthorized / Server Error', err.message?.includes('Access denied') ? 403 : 500);
  }
});
