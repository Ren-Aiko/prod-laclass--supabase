// =====================================================================
// Function: submit-review
// Path: /supabase/functions/submit-review/index.ts
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

    const productId = String(body.product_id || body.productId || '').trim();
    const customerName = String(body.customer_name || body.customerName || '').trim();
    const comment = String(body.comment || body.review_text || body.reviewText || '').trim();
    const rating = Math.round(Number(body.rating || 5));

    if (!productId) {
      return errorResponse('Product ID is required to leave a review.', 400);
    }
    if (!customerName || customerName.length < 2) {
      return errorResponse('Please provide your name.', 400);
    }
    if (rating < 1 || rating > 5) {
      return errorResponse('Rating must be between 1 and 5 stars.', 400);
    }
    if (!comment || comment.length < 5) {
      return errorResponse('Please provide a review comment (minimum 5 characters).', 400);
    }

    // Verify product exists in products table
    const { data: prodCheck, error: pError } = await supabase
      .from('products')
      .select('id, name')
      .or(`product_id.eq.${productId},id.eq.${productId}`)
      .limit(1);

    if (pError || !prodCheck || prodCheck.length === 0) {
      return errorResponse('The specified product was not found in our catalog.', 404);
    }

    // Insert review as approved = false (pending atelier moderation)
    const { data: newReview, error: insError } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        customer_name: customerName,
        rating,
        comment,
        approved: false,
        verified_purchase: false,
      })
      .select()
      .single();

    if (insError) {
      console.error('[submit-review Insert Error]:', insError);
      return errorResponse(insError.message || 'Error saving review.', 400, insError);
    }

    return jsonResponse({
      success: true,
      message: 'Thank you for your feedback! Your review has been submitted for moderation.',
      id: newReview.id,
      approved: false,
    }, 201);
  } catch (err: any) {
    console.error('[submit-review Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
