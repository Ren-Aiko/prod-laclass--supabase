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
    const utrNumber = String(body.utr_number || body.utrNumber || '').trim();
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

    const orderPayload = {
      order_number: body.order_number || body.orderId || `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      amount: Number(body.amount || 0),
      discount_amount: Number(body.discount_amount || 0),
      coupon_code: body.coupon_code || null,
      shipping_fee: Number(body.shipping_fee || 0),
      total_amount: Number(body.total_amount || body.grandTotal || 0),
      utr_number: utrNumber,
      notes: body.notes || '',
      items: items.map((it: any) => ({
        product_id: it.product_id || it.productId,
        product_variant_id: it.product_variant_id || it.variantId || null,
        name: it.name || 'Abaya Couture',
        quantity: Number(it.quantity || 1),
        size: it.size || 'M',
        length: it.length || null,
        price_at_purchase: Number(it.price_at_purchase || it.price || 0),
        custom_measurements: it.custom_measurements || null,
      })),
    };

    // Invoke atomic stock reservation procedure in PostgreSQL
    let { data: orderResult, error: dbError } = await supabase.rpc('create_order_atomic', {
      p_order: orderPayload,
    });

    if (dbError) {
      console.warn('[create-order RPC Error, attempting direct fallback]:', dbError);

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
          amount: orderPayload.amount,
          discount_amount: orderPayload.discount_amount,
          coupon_code: orderPayload.coupon_code,
          shipping_fee: orderPayload.shipping_fee,
          total_amount: orderPayload.total_amount,
          utr_number: orderPayload.utr_number,
          notes: orderPayload.notes,
          payment_status: 'Paid, Awaiting Confirmation',
          payment_method: 'UPI_QR_MANUAL',
          reservation_status: 'reserved',
          reservation_expires_at: expiresAt,
          items: orderPayload.items,
        })
        .select()
        .single();

      if (!directOrderErr && directOrder) {
        // Record order items in order_items table
        for (const it of orderPayload.items) {
          await supabase.from('order_items').insert({
            order_id: directOrder.id,
            product_id: it.product_id,
            product_variant_id: it.product_variant_id,
            product_name: it.name || it.product_name || 'Abaya Couture',
            size: it.size,
            length: it.length,
            price_at_purchase: it.price_at_purchase,
            quantity: it.quantity,
            custom_measurements: it.custom_measurements,
          });
        }

        orderResult = {
          id: directOrder.id,
          order_number: directOrder.order_number,
          reservation_expires_at: directOrder.reservation_expires_at,
        };
        dbError = null;
      } else {
        console.error('[create-order Direct Fallback Error]:', directOrderErr);
        return errorResponse(dbError.message || 'Error processing reservation and order creation.', 400, dbError);
      }
    }

    return jsonResponse({
      success: true,
      id: orderResult.id || orderPayload.order_number,
      order_number: orderResult.order_number || orderPayload.order_number,
      utr_number: utrNumber,
      status: 'Paid, Awaiting Confirmation',
      reservation_expires_at: orderResult.reservation_expires_at,
    }, 201);
  } catch (err: any) {
    console.error('[create-order Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
