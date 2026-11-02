// =====================================================================
// src/services/coupon.ts
// Newsletter Subscription & Coupon Validation Service
// =====================================================================

import { supabase } from './client';
import { Coupon } from '../types/database';
import { invokeEdgeFunction } from '../utils/supabase';

export async function subscribeAndGenerateCoupon(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const result = await invokeEdgeFunction<{ success: boolean; couponCode?: string; message?: string }>('subscribe-newsletter', {
    method: 'POST',
    body: { email: cleanEmail },
  });
  if (!result.success || !result.couponCode) {
    throw new Error(result.message || 'Unable to create a newsletter coupon.');
  }
  return result.couponCode;
}

export async function validateCoupon(code: string, subtotal: number): Promise<Coupon | null> {
  const cleanCode = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', cleanCode)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    // Keep only the documented static demo code as a fallback.
    if (cleanCode === 'LACLASSE10') {
      return {
        id: 'coupon_demo',
        code: cleanCode,
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase: 0,
        expiry_date: null,
        active: true
      };
    }
    return null;
  }

  const coupon = data as Coupon;

  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return null;
  }

  if (subtotal < coupon.min_purchase) {
    return null;
  }

  return coupon;
}
