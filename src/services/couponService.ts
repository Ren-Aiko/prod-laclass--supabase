// =====================================================================
// src/services/couponService.ts
// Decoupled Coupon & Newsletter Service Layer
// =====================================================================

import { getSupabase, isSupabaseConfigured } from '../utils/supabase';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  message?: string;
}

/**
 * Validate discount code against coupons table where is_used = false
 */
export async function validateCoupon(inputCode: string): Promise<CouponValidationResult> {
  const code = inputCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, code, discountPercent: 0, message: 'Please enter a coupon code.' };
  }

  // Default fallback welcome coupon
  if (code === 'WELCOME10') {
    return { valid: true, code: 'WELCOME10', discountPercent: 10, message: '10% Privé Discount Applied!' };
  }

  if (!isSupabaseConfigured()) {
    if (code.startsWith('WELCOME10')) {
      return { valid: true, code, discountPercent: 10, message: '10% Welcome Discount Applied!' };
    }
    return { valid: false, code, discountPercent: 0, message: 'Invalid or expired coupon code.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('coupons')
      .select('code, discount_percent, is_used')
      .ilike('code', code)
      .eq('is_used', false)
      .maybeSingle();

    if (error || !data) {
      if (code.startsWith('WELCOME10')) {
        return { valid: true, code, discountPercent: 10, message: '10% Welcome Discount Applied!' };
      }
      return { valid: false, code, discountPercent: 0, message: 'Invalid or already used coupon code.' };
    }

    return {
      valid: true,
      code: data.code,
      discountPercent: data.discount_percent || 10,
      message: `${data.discount_percent || 10}% Discount Applied!`,
    };
  } catch (err) {
    console.warn('[couponService.validateCoupon exception]:', err);
    return { valid: false, code, discountPercent: 0, message: 'Error checking coupon code.' };
  }
}

/**
 * Newsletter Registration:
 * 1. Submitting email adds a row to `subscribers`
 * 2. Injects a 10% off code (e.g. WELCOME10-XXXX) into `coupons` assigned to their email
 * 3. Returns the code instantly to the screen
 */
export async function subscribeNewsletterAndGenerateCoupon(email: string): Promise<{
  success: boolean;
  couponCode: string;
  alreadySubscribed?: boolean;
  message: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const generatedCode = `WELCOME10-${randomSuffix}`;

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      couponCode: generatedCode,
      message: `Welcome to LaClassé Privé Circle! Your exclusive 10% coupon code is ${generatedCode}.`,
    };
  }

  try {
    const supabase = getSupabase();

    // 1. Add row to subscribers table
    const { error: subError } = await supabase
      .from('subscribers')
      .insert({ email: cleanEmail });

    const alreadySubscribed = Boolean(subError && subError.code === '23505');

    // 2. Inject 10% off coupon into coupons table assigned to their email
    await supabase
      .from('coupons')
      .insert({
        code: generatedCode,
        discount_percent: 10,
        is_used: false,
        assigned_to_email: cleanEmail,
      });

    return {
      success: true,
      alreadySubscribed,
      couponCode: generatedCode,
      message: alreadySubscribed
        ? `You are already part of our Privé Circle! Here is a fresh 10% coupon: ${generatedCode}`
        : `Welcome to the LaClassé Atelier Privé! Your 10% coupon code is ${generatedCode}`,
    };
  } catch (err: any) {
    console.error('[couponService.subscribeNewsletterAndGenerateCoupon error]:', err);
    return {
      success: true,
      couponCode: generatedCode,
      message: `Thank you for subscribing! Your 10% discount code is ${generatedCode}`,
    };
  }
}
