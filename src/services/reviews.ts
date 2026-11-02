import { Review } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction } from '../utils/supabase';

async function fetchProductNames(productIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const supabase = getSupabase();
  const [byRowId, byProductId] = await Promise.all([
    supabase.from('products').select('id, product_id, name').in('id', ids),
    supabase.from('products').select('id, product_id, name').in('product_id', ids),
  ]);

  if (byRowId.error) {
    console.warn('[Review product-name lookup by row ID failed]:', byRowId.error.message);
  }
  if (byProductId.error) {
    console.warn('[Review product-name lookup by product ID failed]:', byProductId.error.message);
  }

  const names = new Map<string, string>();
  for (const product of [...(byRowId.data || []), ...(byProductId.data || [])]) {
    if (product.id && product.name) names.set(product.id, product.name);
    if (product.product_id && product.name) names.set(product.product_id, product.name);
  }
  return names;
}

export const fetchReviews = async (): Promise<Review[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    // Public read: only approved reviews per RLS
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const productNames = await fetchProductNames(data.map((review) => review.product_id));
    return data.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: productNames.get(r.product_id) || 'LaClassé Abaya',
      customerName: r.customer_name,
      rating: Number(r.rating || 5),
      reviewText: r.comment || '',
      date: (r.created_at || '').split('T')[0],
      approved: Boolean(r.approved),
      verifiedPurchase: Boolean(r.verified_purchase),
    }));
  } catch (err) {
    console.warn('[fetchReviews Error]:', err);
    return [];
  }
};

/** Admin: fetch all reviews, including those awaiting moderation. */
export const fetchAdminReviews = async (): Promise<Review[]> => {
  const rows = await invokeEdgeFunction<any[]>('admin-reviews', { method: 'GET' });
  const productNames = await fetchProductNames((rows || []).map((review) => review.product_id));
  return (rows || []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name || productNames.get(r.product_id) || 'LaClassé Abaya',
    customerName: r.customer_name,
    rating: Number(r.rating || 5),
    reviewText: r.comment || '',
    date: (r.created_at || '').split('T')[0],
    approved: Boolean(r.approved),
    verifiedPurchase: Boolean(r.verified_purchase),
  }));
};

/**
 * Public review submission via secure submit-review Edge Function
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
    console.error('[addReview Error]:', err);
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
    console.error('[toggleReviewApproval Error]:', err);
    throw err;
  }
};

/** Admin: edit the customer-visible review fields. */
export const updateReview = async (
  reviewId: string,
  changes: Pick<Review, 'customerName' | 'rating' | 'reviewText'>
): Promise<boolean> => {
  await invokeEdgeFunction('admin-reviews', {
    method: 'PATCH',
    body: {
      id: reviewId,
      customer_name: changes.customerName,
      rating: changes.rating,
      comment: changes.reviewText,
    },
  });
  return true;
};

export const addReviewToSheet = addReview;
export const toggleReviewApprovalInSheet = toggleReviewApproval;
