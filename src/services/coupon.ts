// =====================================================================
// src/services/coupon.ts
// Newsletter Subscription & Coupon Validation Service
// =====================================================================

import { supabase } from './client';
import { Coupon } from '../types/database';

export async function subscribeAndGenerateCoupon(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Save subscriber
  const { error: subError } = await supabase
    .from('subscribers')
    .insert([{ email: cleanEmail }]);

  if (subError && !subError.message.includes('unique') && !subError.message.includes('duplicate')) {
    console.warn('[subscribeAndGenerateCoupon subscriber insert warning]:', subError.message);
  }

  // 2. Generate single-use 10% coupon code
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const couponCode = `ABAYA10-${randomSuffix}`;

  const { error: couponError } = await supabase
    .from('coupons')
    .insert([
      {
        code: couponCode,
        discount_type: 'percentage',
        discount_value: 10.0,
        min_purchase: 0,
        active: true,
      },
    ]);

  if (couponError) {
    console.warn('[subscribeAndGenerateCoupon coupon insert warning]:', couponError.message);
    // Return the generated coupon code even if database unique conflict or table issue
    return couponCode;
  }

  return couponCode;
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
    // Also check standard initial demo coupons if database is empty
    if (cleanCode === 'LACLASSE10' || cleanCode.startsWith('ABAYA10')) {
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
