import { Review } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction } from '../utils/supabase';

export const fetchReviews = async (): Promise<Review[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    // Public read: only approved reviews per RLS policy
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchReviews DB Error]:', error.message, error.code);
      return [];
    }

    if (!data) return [];

    return data.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_id,
      customerName: r.customer_name,
      rating: Number(r.rating || 5),
      reviewText: r.comment || '',
      date: (r.created_at || '').split('T')[0],
      approved: Boolean(r.approved),
      verifiedPurchase: Boolean(r.verified_purchase),
    }));
  } catch (err: any) {
    console.error('[fetchReviews Error]:', err.message);
    return [];
  }
};

/**
 * Public review submission via submit-review Edge Function
 */
export const addReview = async (review: Review): Promise<boolean> => {
  try {
    await invokeEdgeFunction('submit-review', {
      method: 'POST',
      body: {
        product_id: review.productId,
        customer_name: review.customerName,
        rating: review.rating,
        comment: review.reviewText,
      },
    });
    return true;
  } catch (err: any) {
    console.error('[addReview Error]:', err.message);
    throw err;
  }
};

/**
 * Admin: Toggle review approval status via admin-reviews Edge Function
 */
export const toggleReviewApproval = async (reviewId: string, approved: boolean): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-reviews', {
      method: 'PATCH',
      body: {
        id: reviewId,
        approved,
      },
    });
    return true;
  } catch (err: any) {
    console.error('[toggleReviewApproval Error]:', err.message);
    throw err;
  }
};

export const addReviewToSheet = addReview;
export const toggleReviewApprovalInSheet = toggleReviewApproval;
