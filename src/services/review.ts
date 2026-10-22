// =====================================================================
// src/services/review.ts
// Client Reviews Service Layer
// =====================================================================

import { supabase } from './client';
import { Review } from '../types/database';

export async function getApprovedReviews(productId?: string): Promise<Review[]> {
  try {
    let query = supabase.from('reviews').select('*').eq('approved', true);
    if (productId) {
      query = query.eq('product_id', productId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.warn('[getApprovedReviews warning]:', error.message);
      return [];
    }
    return (data as Review[]) || [];
  } catch (err: any) {
    console.warn('[getApprovedReviews catch]:', err?.message);
    return [];
  }
}
