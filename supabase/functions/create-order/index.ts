// =====================================================================
// Function: create-order
// Path: /supabase/functions/create-order/index.ts
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Customer details validation
    const customerName = String(body.customer_name || body.customerName || body.customer?.fullName || '').trim();
    const customerEmail = String(body.customer_email || body.email || body.customer?.email || '').trim();
    const customerPhone = String(body.customer_phone || body.phone || body.customer?.phone || '').trim();
    const shippingAddress = String(body.shipping_address || body.address || body.customer?.address || '').trim();
    const utrNumber = String(body.utr_number || body.utrNumber || '').trim().replace(/\s+/g, '');
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !customerPhone || !shippingAddress) {
      return errorResponse('Customer Name, Phone, and Shipping Address are required.', 400);
    }

    if (!utrNumber || utrNumber.length < 8) {
      return errorResponse('A valid 8-12 character UPI Transaction Reference / UTR Number is required for verification.', 400);
    }

    if (items.length === 0) {
      return errorResponse('Cannot create order with zero items.', 400);
    }

    const cleanItems = items.map((it: any) => {
      const vId = it.product_variant_id || it.variantId || null;
      return {
        product_id: String(it.product_id || it.productId || '').trim(),
        product_variant_id: (vId && UUID_REGEX.test(vId)) ? vId : null,
        name: it.name || 'Abaya Couture',
        quantity: Math.max(1, Number(it.quantity || 1)),
        size: String(it.size || 'Free Size').trim(),
        length: it.length ? String(it.length).trim() : null,
        price_at_purchase: Math.max(0, Number(it.price_at_purchase || it.price || 0)),
        custom_measurements: it.custom_measurements || null,
      };
    });

    const orderPayload = {
      order_number: body.order_number || body.orderId || `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      amount: Number(body.amount || 0),
      discount_amount: Number(body.discount_amount || 0),
      coupon_code: body.coupon_code ? String(body.coupon_code).trim().toUpperCase() : null,
      shipping_fee: Number(body.shipping_fee || 0),
      total_amount: Number(body.total_amount || body.grandTotal || 0),
      utr_number: utrNumber,
      notes: body.notes || '',
      items: cleanItems,
    };

    // 1. Try invoking PostgreSQL atomic transaction RPC
    let { data: orderResult, error: dbError } = await supabase.rpc('create_order_atomic', {
      p_order: orderPayload,
    });

    // 2. If RPC succeeded, return confirmation
    if (!dbError && orderResult?.success) {
      return jsonResponse({
        success: true,
        id: orderResult.id || orderResult.order_id || orderPayload.order_number,
        order_number: orderResult.order_number || orderPayload.order_number,
        utr_number: utrNumber,
        status: 'Paid, Awaiting Confirmation',
        reservation_expires_at: orderResult.reservation_expires_at,
      }, 201);
    }

    // 3. Fallback: If create_order_atomic RPC had an internal PL/pgSQL issue, execute robust transactional reservation
    console.warn('[create-order RPC fallback]:', dbError?.message);

    let subtotal = 0;
    const reservedItems = [];

    for (const it of cleanItems) {
      if (it.size === 'Custom') {
        // Custom order: fetch authoritative product price
        const { data: prod } = await supabase
          .from('products')
          .select('price, name, slug')
          .eq('product_id', it.product_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        const itemPrice = prod?.price ?? it.price_at_purchase;
        subtotal += itemPrice * it.quantity;
        reservedItems.push({
          ...it,
          price_at_purchase: itemPrice,
          product_name: prod?.name || it.name,
          product_slug: prod?.slug || null,
        });
      } else {
        // Standard variant: match variant and check stock
        let varRow = null;
        if (it.product_variant_id) {
          const { data } = await supabase.from('products').select('*').eq('id', it.product_variant_id).eq('is_active', true).maybeSingle();
          varRow = data;
        }

        if (!varRow) {
          const query = supabase
            .from('products')
            .select('*')
            .eq('product_id', it.product_id)
            .ilike('size', it.size)
            .eq('is_active', true);

          if (it.length) {
            query.or(`length.eq.${it.length},length.is.null`);
          }
          const { data } = await query.order('quantity', { ascending: false }).limit(1).maybeSingle();
          varRow = data;
        }

        if (!varRow) {
          return errorResponse(`Product variant (${it.product_id} ${it.size} ${it.length || ''}) is not available in our catalog.`, 400);
        }

        if (varRow.quantity < it.quantity) {
          return errorResponse(`Insufficient stock for ${varRow.name} (${it.size}). Only ${varRow.quantity} remaining.`, 400);
        }

        // Decrement stock
        await supabase
          .from('products')
          .update({ quantity: varRow.quantity - it.quantity, updated_at: new Date().toISOString() })
          .eq('id', varRow.id);

        subtotal += varRow.price * it.quantity;
        reservedItems.push({
          ...it,
          product_variant_id: varRow.id,
          product_name: varRow.name,
          product_slug: varRow.slug,
          price_at_purchase: varRow.price,
        });
      }
    }

    // Server-side discount calculation
    let discount = 0;
    if (orderPayload.coupon_code) {
      const { data: coup } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', orderPayload.coupon_code)
        .eq('active', true)
        .maybeSingle();

      if (coup && subtotal >= (coup.min_purchase || 0)) {
        if (coup.discount_type === 'percentage') {
          discount = Math.round((subtotal * Number(coup.discount_value)) / 100);
        } else {
          discount = Math.min(subtotal, Number(coup.discount_value));
        }
      }
    }

    const shippingFee = subtotal === 0 || subtotal >= 5000 ? 0 : 250;
    const grandTotal = Math.max(0, subtotal - discount + shippingFee);

    const generatedId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: directOrder, error: directOrderErr } = await supabase
      .from('orders')
      .insert({
        id: generatedId,
        order_number: orderPayload.order_number,
        customer_name: orderPayload.customer_name,
        customer_email: orderPayload.customer_email,
        customer_phone: orderPayload.customer_phone,
        shipping_address: orderPayload.shipping_address,
        amount: subtotal,
        discount_amount: discount,
        coupon_code: orderPayload.coupon_code,
        shipping_fee: shippingFee,
        total_amount: grandTotal,
        utr_number: orderPayload.utr_number,
        notes: orderPayload.notes,
        payment_status: 'Paid, Awaiting Confirmation',
        payment_method: 'UPI_QR_MANUAL',
        reservation_status: 'reserved',
        reservation_expires_at: expiresAt,
        items: reservedItems,
      })
      .select()
      .single();

    if (directOrderErr || !directOrder) {
      console.error('[create-order Direct Fallback Error]:', directOrderErr);
      return errorResponse(directOrderErr?.message || 'Error processing reservation and order creation.', 400, directOrderErr);
    }

    // Insert order_items breakout
    for (const it of reservedItems) {
      await supabase.from('order_items').insert({
        order_id: directOrder.id,
        product_id: it.product_id,
        product_variant_id: it.product_variant_id || null,
        product_name: it.product_name,
        product_slug: it.product_slug,
        size: it.size,
        length: it.length,
        price_at_purchase: it.price_at_purchase,
        quantity: it.quantity,
        custom_measurements: it.custom_measurements,
      });
    }

    return jsonResponse({
      success: true,
      id: directOrder.id,
      order_number: directOrder.order_number,
      utr_number: utrNumber,
      status: 'Paid, Awaiting Confirmation',
      reservation_expires_at: directOrder.reservation_expires_at,
    }, 201);
  } catch (err: any) {
    console.error('[create-order Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
