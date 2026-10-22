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
    if (cleanCode === 'WELCOME10') {
      const discount = Math.round((totalAmount * 10) / 100);
      return {
        valid: true,
        discountAmount: discount,
        coupon: {
          code: 'WELCOME10',
          discountType: 'percentage',
          discountValue: 10,
          minPurchase: 0,
          expiryDate: '2026-12-31',
          active: true,
        },
      };
    }
    return { valid: false, discountAmount: 0, error: 'Unable to verify coupon.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', cleanCode)
      .limit(1);

    if (error || !data || data.length === 0) {
      if (cleanCode.startsWith('WELCOME10')) {
        const discount = Math.round((totalAmount * 10) / 100);
        return {
          valid: true,
          discountAmount: discount,
          coupon: {
            code: cleanCode,
            discountType: 'percentage',
            discountValue: 10,
            minPurchase: 0,
            expiryDate: '2026-12-31',
            active: true,
          },
        };
      }
      return { valid: false, discountAmount: 0, error: 'Invalid or inactive promo voucher code.' };
    }

    const coup = data[0];
    if (coup.is_used === true || coup.active === false) {
      return { valid: false, discountAmount: 0, error: 'This coupon code has already been redeemed or is inactive.' };
    }

    const minPurchase = Number(coup.min_purchase || 0);

    if (totalAmount < minPurchase) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon ${cleanCode} requires a minimum order of ₹${minPurchase.toLocaleString('en-IN')}.`,
      };
    }

    const discountPercent = coup.discount_percent ?? (coup.discount_type === 'percentage' ? Number(coup.discount_value) : null);
    let discountAmount = 0;

    if (discountPercent != null) {
      discountAmount = Math.round((totalAmount * Number(discountPercent)) / 100);
    } else {
      discountAmount = Math.min(totalAmount, Number(coup.discount_value || 0));
    }

    return {
      valid: true,
      discountAmount,
      coupon: {
        code: coup.code,
        discountType: discountPercent != null ? 'percentage' : (coup.discount_type || 'percentage'),
        discountValue: discountPercent != null ? Number(discountPercent) : Number(coup.discount_value || 10),
        minPurchase,
        expiryDate: coup.expiry_date || '2026-12-31',
        active: true,
      },
    };
  } catch (err: any) {
    console.error('[verifyCouponCode Error]:', err);
    return { valid: false, discountAmount: 0, error: 'Error connecting to coupon verification.' };
  }
};

export const fetchCoupons = async (): Promise<Coupon[]> => {
  if (!isSupabaseConfigured()) {
    return [
      {
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 0,
        expiryDate: '2026-12-31',
        active: true,
      },
    ];
  }

  try {
    const raw = await invokeEdgeFunction<any[]>('admin-coupons', {
      method: 'GET',
    });

    if (Array.isArray(raw)) {
      return raw.map((c) => ({
        code: c.code,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value),
        minPurchase: Number(c.min_purchase || 0),
        expiryDate: c.expiry_date || '2026-12-31',
        active: Boolean(c.active),
      }));
    }
  } catch (e) {
    console.warn('[fetchCoupons fallback]:', e);
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
    console.error('[saveCoupon Error]:', err);
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
    console.error('[deleteCoupon Error]:', err);
    throw err;
  }
};

export const saveCouponToSheet = saveCoupon;
export const deleteCouponFromSheet = deleteCoupon;
