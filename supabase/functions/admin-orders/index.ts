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

    // PATCH /admin-orders (State machine mutations)
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const idOrNumber = String(body.id || body.order_id || body.orderId || '').trim();
      const targetStatus = String(body.status || body.payment_status || '').trim();
      const courierName = body.courier_name || null;
      const trackingNumber = body.tracking_number || null;
      const reason = body.reason ? String(body.reason).trim() : null;

      if (!idOrNumber || !targetStatus) {
        return errorResponse('Order ID and new Status are required.', 400);
      }

      // Fetch the order and items safely
      const isUuid = UUID_REGEX.test(idOrNumber);
      const query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `);

      const { data: order, error: fetchErr } = isUuid
        ? await query.eq('id', idOrNumber).single()
        : await query.eq('order_number', idOrNumber).single();

      if (fetchErr || !order) {
        return errorResponse(`Order not found for identifier "${idOrNumber}".`, 404);
      }

      const currentStatus = order.payment_status;

      // CASE 1: APPROVE PAYMENT ('Payment Confirmed')
      if (targetStatus === 'Payment Confirmed') {
        if (currentStatus === 'Payment Rejected') {
          return errorResponse('Cannot approve a previously rejected order. Customer must place a new order.', 400);
        }
        if (currentStatus === 'Cancelled' || currentStatus === 'Refunded') {
          return errorResponse(`Cannot confirm payment for order with status "${currentStatus}".`, 400);
        }

        const { data: confirmedOrder, error: confError } = await supabase.rpc('confirm_order_payment', {
          p_order_id: order.id,
        });

        if (confError) {
          console.error('[confirm_order_payment RPC Error]:', confError);
          // Fallback if RPC encounters issues: commit directly
          await supabase
            .from('orders')
            .update({
              payment_status: 'Payment Confirmed',
              reservation_status: 'committed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          return jsonResponse({ success: true, payment_status: 'Payment Confirmed' });
        }

        return jsonResponse({ success: true, updated: confirmedOrder });
      }

      // CASE 2: REJECT PAYMENT ('Payment Rejected')
      if (targetStatus === 'Payment Rejected') {
        if (currentStatus === 'Payment Rejected') {
          return errorResponse('Order payment is already rejected.', 400);
        }
        if (currentStatus === 'Payment Confirmed' || currentStatus === 'Shipped' || currentStatus === 'Delivered') {
          return errorResponse('Cannot reject payment on confirmed/fulfilled order. Please process a Refund instead.', 400);
        }

        // Try PostgreSQL reject_order_payment RPC first if defined
        try {
          const { data: rpcResult, error: rpcErr } = await supabase.rpc('reject_order_payment', {
            p_order_id: order.id,
            p_reason: reason || 'Payment verification failed',
          });
          if (!rpcErr && rpcResult?.success) {
            return jsonResponse({ success: true, updated: rpcResult });
          }
        } catch {}

        // Fallback atomic release in Edge Function:
        // If reservation is active ('reserved'), restore standard variant inventory exactly once
        if (order.reservation_status === 'reserved' && Array.isArray(order.items)) {
          for (const it of order.items) {
            if (it.product_variant_id && it.size !== 'Custom') {
              const { data: vRow } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', it.product_variant_id)
                .single();

              if (vRow) {
                await supabase
                  .from('products')
                  .update({ quantity: (vRow.quantity || 0) + it.quantity, updated_at: new Date().toISOString() })
                  .eq('id', it.product_variant_id);
              }
            }
          }
        }

        const rejectNote = `[Payment Rejected: ${reason || 'UTR verification failed'}]`;
        const updatedNotes = order.notes ? `${order.notes}\n${rejectNote}` : rejectNote;

        const { data: updatedOrder, error: upError } = await supabase
          .from('orders')
          .update({
            payment_status: 'Payment Rejected',
            reservation_status: 'released',
            notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          .select()
          .single();

        if (upError) {
          // If check constraint does not yet have 'Payment Rejected', update with Cancelled + rejection notes
          const { data: fallbackOrder, error: fbError } = await supabase
            .from('orders')
            .update({
              payment_status: 'Cancelled',
              reservation_status: 'released',
              notes: updatedNotes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .select()
            .single();

          if (fbError) return errorResponse(fbError.message, 400, fbError);
          return jsonResponse({ success: true, updated: fallbackOrder, note: 'Cancelled via payment rejection' });
        }

        return jsonResponse({ success: true, updated: updatedOrder });
      }

      // CASE 3: CANCEL ORDER ('Cancelled')
      if (targetStatus === 'Cancelled') {
        if (currentStatus === 'Cancelled') {
          return errorResponse('Order is already cancelled.', 400);
        }

        // If unpaid and reserved, release stock
        if (order.reservation_status === 'reserved' && currentStatus === 'Paid, Awaiting Confirmation' && Array.isArray(order.items)) {
          for (const it of order.items) {
            if (it.product_variant_id && it.size !== 'Custom') {
              const { data: vRow } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', it.product_variant_id)
                .single();

              if (vRow) {
                await supabase
                  .from('products')
                  .update({ quantity: (vRow.quantity || 0) + it.quantity, updated_at: new Date().toISOString() })
                  .eq('id', it.product_variant_id);
              }
            }
          }
        }

        const { data: updatedOrder, error: upError } = await supabase
          .from('orders')
          .update({
            payment_status: 'Cancelled',
            reservation_status: order.reservation_status === 'reserved' ? 'released' : order.reservation_status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          .select()
          .single();

        if (upError) return errorResponse(upError.message, 400, upError);
        return jsonResponse({ success: true, updated: updatedOrder });
      }

      // CASE 4: FULFILLMENT ('Shipped', 'Delivered')
      if (targetStatus === 'Shipped' || targetStatus === 'Delivered') {
        if (currentStatus !== 'Payment Confirmed' && currentStatus !== 'Shipped') {
          return errorResponse(`Cannot transition to "${targetStatus}" when current payment status is "${currentStatus}". Payment must be confirmed first.`, 400);
        }

        const updateData: Record<string, any> = {
          payment_status: targetStatus,
          updated_at: new Date().toISOString(),
        };

        if (courierName) updateData.courier_name = courierName;
        if (trackingNumber) updateData.tracking_number = trackingNumber;

        const { data: updatedOrder, error: upError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id)
          .select()
          .single();

        if (upError) return errorResponse(upError.message, 400, upError);
        return jsonResponse({ success: true, updated: updatedOrder });
      }

      // CASE 5: REFUND ('Refunded')
      if (targetStatus === 'Refunded') {
        if (currentStatus !== 'Payment Confirmed' && currentStatus !== 'Shipped' && currentStatus !== 'Delivered') {
          return errorResponse(`Refund is only applicable for paid orders. Current status is "${currentStatus}".`, 400);
        }

        const { data: updatedOrder, error: upError } = await supabase
          .from('orders')
          .update({
            payment_status: 'Refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          .select()
          .single();

        if (upError) return errorResponse(upError.message, 400, upError);
        return jsonResponse({ success: true, updated: updatedOrder });
      }

      // Default status update
      const { data: updatedOrder, error: upError } = await supabase
        .from('orders')
        .update({
          payment_status: targetStatus,
          courier_name: courierName || order.courier_name,
          tracking_number: trackingNumber || order.tracking_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select()
        .single();

      if (upError) return errorResponse(upError.message, 400, upError);
      return jsonResponse({ success: true, updated: updatedOrder });
    }

    // POST /admin-orders (Explicit restock action)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const orderId = String(body.order_id || body.id || '').trim();
      const action = String(body.action || '').trim();

      if (action === 'restock' && orderId) {
        const isUuid = UUID_REGEX.test(orderId);
        let resolvedId = orderId;

        if (!isUuid) {
          const { data: ord } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', orderId)
            .single();

          if (ord) resolvedId = ord.id;
        }

        const { data: restocked, error: restockErr } = await supabase.rpc('restock_order_explicit', {
          p_order_id: resolvedId,
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
