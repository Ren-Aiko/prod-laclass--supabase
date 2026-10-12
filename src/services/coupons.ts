import { Coupon } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction } from '../utils/supabase';

export const verifyCouponCode = async (
  code: string,
  totalAmount: number
): Promise<{ valid: boolean; discountAmount: number; coupon?: Coupon; error?: string }> => {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    return { valid: false, discountAmount: 0, error: 'Coupon voucher code is required.' };
  }

  if (!isSupabaseConfigured()) {
    return { valid: false, discountAmount: 0, error: 'Coupon verification service is unavailable.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, min_purchase, expiry_date, active')
      .ilike('code', cleanCode)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('[verifyCouponCode DB Error]:', error.message, error.code);
      return { valid: false, discountAmount: 0, error: 'Trouble verifying coupon with server.' };
    }

    if (!data) {
      return { valid: false, discountAmount: 0, error: 'Invalid or inactive promo voucher code.' };
    }

    // Check expiry date if specified
    if (data.expiry_date) {
      const today = new Date().toISOString().split('T')[0];
      if (data.expiry_date < today) {
        return { valid: false, discountAmount: 0, error: `Coupon ${cleanCode} has expired.` };
      }
    }

    const minPurchase = Number(data.min_purchase || 0);

    if (totalAmount < minPurchase) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon ${cleanCode} requires a minimum order of ₹${minPurchase.toLocaleString('en-IN')}.`,
      };
    }

    let discountAmount = 0;
    if (data.discount_type === 'percentage') {
      discountAmount = Math.round((totalAmount * Number(data.discount_value)) / 100);
    } else {
      discountAmount = Math.min(totalAmount, Number(data.discount_value));
    }

    return {
      valid: true,
      discountAmount,
      coupon: {
        code: data.code,
        discountType: data.discount_type,
        discountValue: Number(data.discount_value),
        minPurchase,
        expiryDate: data.expiry_date || '2026-12-31',
        active: Boolean(data.active),
      },
    };
  } catch (err: any) {
    console.error('[verifyCouponCode Error]:', err.message);
    return { valid: false, discountAmount: 0, error: 'Error connecting to coupon verification.' };
  }
};

export const fetchCoupons = async (): Promise<Coupon[]> => {
  try {
    const data = await invokeEdgeFunction<any[]>('admin-coupons', {
      method: 'GET',
    });

    if (Array.isArray(data)) {
      return data.map((c) => ({
        code: c.code,
        discountType: c.discount_type || c.discountType,
        discountValue: Number(c.discount_value ?? c.discountValue),
        minPurchase: Number(c.min_purchase ?? c.minPurchase ?? 0),
        expiryDate: c.expiry_date || c.expiryDate || '2026-12-31',
        active: Boolean(c.active),
      }));
    }
  } catch (err: any) {
    console.warn('[fetchCoupons Edge Function Error, trying client select]:', err.message);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((c) => ({
          code: c.code,
          discountType: c.discount_type,
          discountValue: Number(c.discount_value),
          minPurchase: Number(c.min_purchase || 0),
          expiryDate: c.expiry_date || '2026-12-31',
          active: Boolean(c.active),
        }));
      }
    } catch (e: any) {
      console.error('[fetchCoupons Supabase Error]:', e.message);
    }
  }

  return [];
};

export const saveCoupon = async (coupon: Coupon): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-coupons', {
      method: 'POST',
      body: coupon,
    });
    return true;
  } catch (err: any) {
    console.error('[saveCoupon Error]:', err.message);
    throw err;
  }
};

export const deleteCoupon = async (code: string): Promise<boolean> => {
  try {
    await invokeEdgeFunction(`admin-coupons?code=${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err: any) {
    console.error('[deleteCoupon Error]:', err.message);
    throw err;
  }
};

export const saveCouponToSheet = saveCoupon;
export const deleteCouponFromSheet = deleteCoupon;
