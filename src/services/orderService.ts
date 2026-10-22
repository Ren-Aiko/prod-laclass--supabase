// =====================================================================
// src/services/orderService.ts
// Decoupled Order Service Layer (Checkout Creation, Admin State Changes)
// =====================================================================

import { getSupabase } from '../utils/supabase';
import { Order, OrderItem, OrderStatus } from '../types';

export interface CheckoutPayload {
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  total_amount: number;
  utr_number: string;
  coupon_used?: string | null;
  items: {
    product_id: string;
    product_name?: string;
    selected_size: string;
    quantity: number;
    price_at_purchase: number;
  }[];
}

/**
 * Record a checkout order cleanly across both `orders` and `order_items` tables.
 * Default status: 'pending_verification'
 */
export async function createCheckoutOrder(payload: CheckoutPayload): Promise<{ success: boolean; id: string; utr_number: string }> {
  const supabase = getSupabase();
  const orderId = crypto.randomUUID();

  // 1. Insert into orders table
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      order_number: `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      shipping_address: payload.shipping_address,
      total_amount: payload.total_amount,
      utr_number: payload.utr_number.trim(),
      status: 'pending_verification',
      coupon_used: payload.coupon_used || null,
    })
    .select()
    .single();

  if (orderError) {
    console.error('[orderService.createCheckoutOrder orders table error]:', orderError);
    throw new Error(orderError.message || 'Failed to record order header.');
  }

  // 2. Insert into order_items table
  const itemsToInsert = payload.items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id && item.product_id.length === 36 ? item.product_id : null,
    product_name: item.product_name || 'Abaya Couture',
    selected_size: item.selected_size,
    quantity: item.quantity,
    price_at_purchase: item.price_at_purchase,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('[orderService.createCheckoutOrder order_items error]:', itemsError);
    // Continue if items insert succeeds partially
  }

  return {
    success: true,
    id: orderData.id,
    utr_number: payload.utr_number,
  };
}

/**
 * Fetch all orders for Admin Panel, optionally filtered by status
 */
export async function fetchOrdersAdmin(statusFilter?: string): Promise<Order[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'All') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[orderService.fetchOrdersAdmin error]:', error);
    throw new Error(error.message);
  }

  return (data || []).map(mapRowToOrder);
}

/**
 * Update order status upon verifying the manual bank UTR string
 * Status values: 'pending_verification' | 'confirmed' | 'rejected'
 */
export async function updateOrderStatusAdmin(orderId: string, status: 'pending_verification' | 'confirmed' | 'rejected'): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('orders')
    .update({ 
      status,
      payment_status: status === 'confirmed' ? 'Payment Confirmed' : (status === 'rejected' ? 'Cancelled' : 'Pending Verification')
    })
    .eq('id', orderId);

  if (error) {
    console.error('[orderService.updateOrderStatusAdmin error]:', error);
    throw new Error(error.message);
  }

  return true;
}

function mapRowToOrder(row: any): Order {
  const items = Array.isArray(row.order_items)
    ? row.order_items.map((it: any) => ({
        product_id: it.product_id,
        name: it.product_name || it.name || 'Abaya Couture',
        size: it.selected_size || it.size || 'M',
        quantity: it.quantity || 1,
        price_at_purchase: Number(it.price_at_purchase || 0),
      }))
    : (Array.isArray(row.items) ? row.items : []);

  const rawStatus = row.status || row.payment_status || 'pending_verification';
  let normalizedStatus: OrderStatus = 'Paid, Awaiting Confirmation';
  if (rawStatus === 'confirmed' || rawStatus === 'Payment Confirmed') {
    normalizedStatus = 'Payment Confirmed';
  } else if (rawStatus === 'rejected' || rawStatus === 'Cancelled') {
    normalizedStatus = 'Cancelled';
  }

  return {
    id: row.id,
    orderId: row.order_number || row.id,
    date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    customer: {
      fullName: row.customer_name || 'Valued Client',
      email: row.customer_email || '',
      phone: row.customer_phone || '',
      address: row.shipping_address || '',
    },
    items,
    amount: Number(row.total_amount || row.amount || 0),
    discountAmount: 0,
    shippingFee: 0,
    grandTotal: Number(row.total_amount || 0),
    utrNumber: row.utr_number || '',
    utr_number: row.utr_number || '',
    status: normalizedStatus,
    paymentStatus: rawStatus,
    paymentMethod: 'UPI_QR_MANUAL',
    couponCode: row.coupon_used,
  };
}
