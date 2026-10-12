import { Order, OrderItem, OrderStatus } from '../types';
import { invokeEdgeFunction } from '../utils/supabase';

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
        product_variant_id: i.product_variant_id || null,
        name: String(i.name || i.product_name || 'Abaya Couture Design'),
        quantity: Number(i.quantity || 1),
        size: String(i.size || 'Free Size'),
        length: i.length || null,
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
    reservation_status: row.reservation_status || 'reserved',
    reservation_expires_at: row.reservation_expires_at || null,
    restocked_at: row.restocked_at || null,
    notes: row.notes || undefined,
  };
}

/**
 * Atomically create order with UTR and reserve stock via create-order Edge Function.
 * Revalidates stock and price authoritatively on the backend.
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
    coupon_code: order.couponCode || null,
    shipping_fee: order.shippingFee,
    total_amount: order.grandTotal,
    utr_number: order.utrNumber || order.utr_number || '',
    notes: order.customer.notes || order.notes || '',
    items: order.items.map((item) => ({
      product_id: item.product_id || item.productId,
      product_variant_id: item.product_variant_id || (item as any).variantId || null,
      name: item.name,
      product_name: item.name,
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

    if (!result || (!result.success && !result.id && !result.order_number)) {
      throw new Error(result?.error || 'Failed to place order.');
    }

    return {
      success: true,
      id: result.order_number || result.id || order.orderId,
      utr_number: result.utr_number || payload.utr_number,
    };
  } catch (err: any) {
    console.error('[createOrder Error]:', err.message);
    throw new Error(err.message || 'Trouble connecting to our servers. Please try our WhatsApp.');
  }
};

/**
 * Fetch all orders via admin-orders Edge Function (Authorized Admin)
 */
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const rawList = await invokeEdgeFunction<any[]>('admin-orders', {
      method: 'GET',
    });

    return Array.isArray(rawList) ? rawList.map(mapRowToOrder) : [];
  } catch (err: any) {
    console.error('[fetchOrders Edge Function Error]:', err.message);
    throw err;
  }
};

/**
 * Update order status via admin-orders Edge Function
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  courierName?: string,
  trackingNumber?: string,
  reason?: string
): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-orders', {
      method: 'PATCH',
      body: {
        id: orderId,
        status,
        payment_status: status,
        courier_name: courierName || null,
        tracking_number: trackingNumber || null,
        reason: reason || null,
      },
    });

    return true;
  } catch (err: any) {
    console.error('[updateOrderStatus Error]:', err.message);
    throw err;
  }
};

/**
 * Reject order payment with explicit reason and atomic stock restoration
 */
export const rejectOrderPayment = async (orderId: string, reason: string): Promise<boolean> => {
  return updateOrderStatus(orderId, 'Payment Rejected', undefined, undefined, reason);
};

/**
 * Explicit restock for cancelled/refunded paid order (Admin protected)
 */
export const restockCancelledOrder = async (orderId: string): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-orders', {
      method: 'POST',
      body: {
        order_id: orderId,
        action: 'restock',
      },
    });

    return true;
  } catch (err: any) {
    console.error('[restockCancelledOrder Error]:', err.message);
    throw err;
  }
};

export const createOrderInSheet = createOrder;
export const updateOrderStatusInSheet = updateOrderStatus;
