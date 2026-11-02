import { Subscriber, SubscribeResult } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction } from '../utils/supabase';

export const subscribeToNewsletter = async (email: string): Promise<SubscribeResult> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await invokeEdgeFunction<any>('subscribe-newsletter', {
      method: 'POST',
      body: { email: cleanEmail },
    });

    return {
      success: Boolean(res.success),
      alreadySubscribed: Boolean(res.alreadySubscribed),
      couponCode: res.couponCode,
      message: res.message || 'Thank you for subscribing.',
    };
  } catch (err: any) {
    return {
      success: false,
      alreadySubscribed: false,
      message: err.message || 'Unable to complete subscription at this time.',
    };
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
      id: s.id,
      email: s.email,
      subscribedAt: s.created_at,
    }));
  } catch (err) {
    console.warn('[fetchSubscribers Error]:', err);
    return [];
  }
};

export const subscribeToNewsletterInSheet = subscribeToNewsletter;
