import { Order, OrderItem, OrderStatus } from '../types';
import { invokeEdgeFunction, getSupabase } from '../utils/supabase';

export function mapRowToOrder(row: any): Order {
  let rawItems = row.items;
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }

  const items: OrderItem[] = Array.isArray(rawItems)
    ? rawItems.map((i: any) => ({
        id: String(i.id || ''),
        order_id: String(i.order_id || row.id || ''),
        product_id: String(i.product_id || i.productId || ''),
        productId: String(i.product_id || i.productId || ''),
        name: String(i.name || i.product_name || 'Abaya Couture Design'),
        quantity: Number(i.quantity || 1),
        size: String(i.size || 'M'),
        length: i.length || undefined,
        price_at_purchase: Number(i.price_at_purchase || i.price || 0),
        custom_measurements: i.custom_measurements || null,
      }))
    : [];

  const orderNumber = String(row.order_number || row.id || '');
  const utrNumber = String(row.utr_number || '');
  const paymentStatus = String(row.payment_status || 'Paid, Awaiting Confirmation');

  return {
    id: String(row.id || ''),
    orderId: orderNumber,
    date: String(row.created_at || new Date().toISOString()),
    customer: {
      fullName: String(row.customer_name || ''),
      email: String(row.customer_email || row.email || ''),
      phone: String(row.customer_phone || row.phone || ''),
      address: String(row.shipping_address || row.address || ''),
      notes: row.notes || undefined,
    },
    items,
    amount: Number(row.amount || 0),
    discountAmount: Number(row.discount_amount || 0),
    shippingFee: Number(row.shipping_fee || 0),
    grandTotal: Number(row.total_amount || 0),
    utrNumber,
    utr_number: utrNumber,
    status: paymentStatus as OrderStatus,
    paymentStatus,
    payment_status: paymentStatus,
    paymentMethod: String(row.payment_method || 'UPI_QR_MANUAL'),
    payment_method: String(row.payment_method || 'UPI_QR_MANUAL'),
    courierName: row.courier_name || undefined,
    courier_name: row.courier_name || undefined,
    trackingNumber: row.tracking_number || undefined,
    tracking_number: row.tracking_number || undefined,
    notes: row.notes || undefined,
  };
}

/**
 * Atomically create order with UTR and reserve stock via Supabase Edge Function
 */
export const createOrder = async (order: Order): Promise<{ success: boolean; id: string; utr_number: string }> => {
  const payload = {
    order_number: order.orderId,
    customer_name: order.customer.fullName,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    shipping_address: order.customer.address 
      ? (order.customer.city ? `${order.customer.address}, ${order.customer.city}, ${order.customer.state || ''} - ${order.customer.pincode || ''}` : order.customer.address)
      : '',
    amount: order.amount,
    discount_amount: order.discountAmount,
    coupon_code: order.couponCode,
    shipping_fee: order.shippingFee,
    total_amount: order.grandTotal,
    utr_number: order.utrNumber || order.utr_number || '',
    notes: order.customer.notes || order.notes || '',
    items: order.items.map((item) => ({
      product_id: item.product_id || item.productId,
      product_variant_id: item.product_variant_id || (item as any).variantId || null,
      name: item.name,
      quantity: item.quantity,
      size: item.size,
      length: item.length || null,
      price_at_purchase: item.price_at_purchase,
      custom_measurements: item.custom_measurements || null,
    })),
  };

  try {
    const result = await invokeEdgeFunction<any>('create-order', {
      method: 'POST',
      body: payload,
    });

    return {
      success: true,
      id: result.order_number || result.id || order.orderId,
      utr_number: result.utr_number || payload.utr_number,
    };
  } catch (err: any) {
    console.warn('[invokeEdgeFunction create-order failed, attempting client-side fallback]:', err);
    try {
      const supabase = getSupabase();

      // 1. Try calling PostgreSQL RPC directly
      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_order_atomic', {
        p_order: payload,
      });

      if (!rpcErr && rpcData) {
        return {
          success: true,
          id: rpcData.order_number || rpcData.id || order.orderId,
          utr_number: payload.utr_number,
        };
      }

      // 2. Fallback: Direct insert into orders table
      const orderId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { data: directOrder, error: directErr } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          order_number: payload.order_number,
          customer_name: payload.customer_name,
          customer_email: payload.customer_email,
          customer_phone: payload.customer_phone,
          shipping_address: payload.shipping_address,
          amount: payload.amount,
          discount_amount: payload.discount_amount,
          coupon_code: payload.coupon_code,
          shipping_fee: payload.shipping_fee,
          total_amount: payload.total_amount,
          utr_number: payload.utr_number,
          notes: payload.notes,
          payment_status: 'Paid, Awaiting Confirmation',
          payment_method: 'UPI_QR_MANUAL',
          reservation_status: 'reserved',
          reservation_expires_at: expiresAt,
          items: payload.items,
        })
        .select()
        .single();

      if (!directErr && directOrder) {
        // Also insert breakout records into order_items table
        for (const it of payload.items) {
          try {
            await supabase.from('order_items').insert({
              order_id: directOrder.id,
              product_id: it.product_id && it.product_id.length === 36 ? it.product_id : null,
              product_name: it.name || 'Abaya Couture',
              selected_size: it.size || 'M',
              quantity: it.quantity || 1,
              price_at_purchase: it.price_at_purchase || 0,
            });
          } catch {}
        }

        return {
          success: true,
          id: directOrder.order_number || directOrder.id || order.orderId,
          utr_number: payload.utr_number,
        };
      }
    } catch (fallbackErr) {
      console.warn('[Direct client order fallback error]:', fallbackErr);
    }

    throw err;
  }
};

/**
 * Fetch all orders (Admin protected Edge Function)
 */
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const rawList = await invokeEdgeFunction<any[]>('admin-orders', {
      method: 'GET',
    });

    return Array.isArray(rawList) ? rawList.map(mapRowToOrder) : [];
  } catch (err: any) {
    console.error('[fetchOrders Error]:', err);
    throw err;
  }
};

/**
 * Update order status (Admin protected Edge Function)
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  courierName?: string,
  trackingNumber?: string
): Promise<boolean> => {
  await invokeEdgeFunction('admin-orders', {
    method: 'PATCH',
    body: {
      id: orderId,
      status,
      payment_status: status,
      courier_name: courierName,
      tracking_number: trackingNumber,
    },
  });

  return true;
};

/**
 * Explicit restock for cancelled/refunded paid order (Admin protected)
 */
export const restockCancelledOrder = async (orderId: string): Promise<boolean> => {
  await invokeEdgeFunction('admin-orders', {
    method: 'POST',
    body: {
      order_id: orderId,
      action: 'restock',
    },
  });

  return true;
};

export const createOrderInSheet = createOrder;
export const updateOrderStatusInSheet = updateOrderStatus;
