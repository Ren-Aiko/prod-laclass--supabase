import { Subscriber, SubscribeResult } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction } from '../utils/supabase';
import { subscribeNewsletterAndGenerateCoupon } from './couponService';

export const subscribeToNewsletter = async (email: string): Promise<SubscribeResult> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Try decoupled coupon service (inserts subscriber + injects unique 10% coupon into coupons table)
    const result = await subscribeNewsletterAndGenerateCoupon(cleanEmail);
    return {
      success: result.success,
      alreadySubscribed: Boolean(result.alreadySubscribed),
      couponCode: result.couponCode,
      message: result.message,
    };
  } catch (err: any) {
    console.warn('[subscribeToNewsletter decoupled service failed, attempting edge function]:', err);
    try {
      const res = await invokeEdgeFunction<any>('subscribe-newsletter', {
        method: 'POST',
        body: { email: cleanEmail },
      });

      return {
        success: res.success,
        alreadySubscribed: Boolean(res.alreadySubscribed),
        couponCode: res.couponCode || 'WELCOME10',
        message: res.message || 'Thank you for subscribing! Use code WELCOME10 for 10% off.',
      };
    } catch (edgeErr: any) {
      return {
        success: false,
        alreadySubscribed: false,
        message: edgeErr.message || 'Unable to complete subscription at this time.',
      };
    }
  }
};

export const fetchSubscribers = async (): Promise<Subscriber[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((s) => ({
      email: s.email,
      subscribedAt: s.created_at,
    }));
  } catch (err) {
    console.warn('[fetchSubscribers Error]:', err);
    return [];
  }
};

export const subscribeToNewsletterInSheet = subscribeToNewsletter;
