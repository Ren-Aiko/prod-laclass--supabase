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

    // Reuse an existing subscriber record to keep the newsletter email unique.
    const { data: existing, error: existingError } = await supabase
      .from('subscribers')
      .select('id, email')
      .ilike('email', rawEmail)
      .maybeSingle();

    if (existingError) {
      return errorResponse(existingError.message || 'Unable to check subscription.', 500);
    }

    let subscriberId = existing?.id;
    if (!subscriberId) {
      const { data: newSubscriber, error: insertError } = await supabase
        .from('subscribers')
        .insert({ email: rawEmail })
        .select('id, email')
        .single();

      if (insertError || !newSubscriber) {
        console.error('[subscribe-newsletter Insert Error]:', insertError);
        return errorResponse(insertError?.message || 'Unable to record subscription.', 400, insertError);
      }
      subscriberId = newSubscriber.id;
    }

    // Return the same coupon on repeated subscriptions. Create and persist a
    // unique 10% coupon if this subscriber has not received one yet.
    const { data: linkedCoupon, error: linkedCouponError } = await supabase
      .from('coupons')
      .select('code')
      .eq('subscriber_email', rawEmail)
      .maybeSingle();

    if (linkedCouponError) {
      return errorResponse(`Unable to look up newsletter coupon. Apply database migration 08_newsletter_coupon_subscriber.sql. ${linkedCouponError.message}`, 500);
    }

    if (linkedCoupon?.code) {
      return jsonResponse({
        success: true,
        alreadySubscribed: true,
        couponCode: linkedCoupon.code,
        message: 'You are already subscribed. Here is your 10% welcome code.',
      });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const expiryDate = expiry.toISOString().slice(0, 10);
    let couponCode = '';
    let couponError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      couponCode = `ABAYA10-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
      const { error } = await supabase.from('coupons').insert({
        code: couponCode,
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase: 0,
        expiry_date: expiryDate,
        subscriber_email: rawEmail,
        active: true,
      });

      if (!error) {
        couponError = null;
        break;
      }
      couponError = error;
      if (error.code === '23505') {
        const { data: concurrentCoupon } = await supabase
          .from('coupons')
          .select('code')
          .eq('subscriber_email', rawEmail)
          .maybeSingle();
        if (concurrentCoupon?.code) {
          return jsonResponse({
            success: true,
            alreadySubscribed: true,
            couponCode: concurrentCoupon.code,
            message: 'You are already subscribed. Here is your 10% welcome code.',
          });
        }
        continue;
      }
      break;
    }

    if (couponError) {
      console.error('[subscribe-newsletter Coupon Insert Error]:', couponError);
      if (!existing) await supabase.from('subscribers').delete().eq('id', subscriberId);
      return errorResponse(couponError.message || 'Unable to create your coupon.', 500, couponError);
    }

    return jsonResponse({
      success: true,
      alreadySubscribed: false,
      couponCode,
      message: 'Thank you for joining our Privé Circle! Your 10% coupon is ready.',
    }, 201);
  } catch (err: any) {
    console.error('[subscribe-newsletter Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
