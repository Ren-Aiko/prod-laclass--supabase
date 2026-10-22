// =====================================================================
// src/services/reviewService.ts
// Decoupled Review Service Layer (Public Moderated Reviews & Admin Approval)
// =====================================================================

import { getSupabase, isSupabaseConfigured } from '../utils/supabase';
import { Review } from '../types';

/**
 * Public Client Reviews Page strictly queries and renders items where is_approved is true
 */
export async function fetchApprovedReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[reviewService.fetchApprovedReviews warning]:', error);
      return [];
    }

    return data.map(mapRowToReview);
  } catch (err) {
    console.error('[reviewService.fetchApprovedReviews error]:', err);
    return [];
  }
}

/**
 * Fetch all reviews for Admin Panel with approval checklist
 */
export async function fetchAllReviewsAdmin(): Promise<Review[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[reviewService.fetchAllReviewsAdmin error]:', error);
      return [];
    }

    return data.map(mapRowToReview);
  } catch (err) {
    console.error('[reviewService.fetchAllReviewsAdmin error]:', err);
    return [];
  }
}

/**
 * Submit customer review. Defaults is_approved to false for atelier moderation.
 */
export async function submitCustomerReview(payload: {
  customer_name: string;
  rating: number;
  comment: string;
  product_id?: string;
}): Promise<{ success: boolean; id: string; message: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      customer_name: payload.customer_name.trim(),
      rating: Math.max(1, Math.min(5, Math.round(payload.rating))),
      comment: payload.comment.trim(),
      product_id: payload.product_id || null,
      is_approved: false, // strictly false until admin approval
    })
    .select()
    .single();

  if (error) {
    console.error('[reviewService.submitCustomerReview error]:', error);
    throw new Error(error.message || 'Failed to submit review for moderation.');
  }

  return {
    success: true,
    id: data.id,
    message: 'Thank you! Your testimonial has been submitted for atelier moderation.',
  };
}

/**
 * Admin Panel: Approve review (sets is_approved to true)
 */
export async function approveReviewAdmin(reviewId: string, isApproved = true): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('reviews')
    .update({ is_approved: isApproved, approved: isApproved })
    .eq('id', reviewId);

  if (error) {
    console.error('[reviewService.approveReviewAdmin error]:', error);
    throw new Error(error.message);
  }

  return true;
}

function mapRowToReview(row: any): Review {
  const customer = row.customer_name || 'Client Review';
  const text = row.comment || row.review_text || row.reviewText || '';
  return {
    id: row.id,
    productId: row.product_id || 'LC001',
    productName: row.product_name || 'Signature Abaya',
    customerName: customer,
    author: customer,
    rating: row.rating || 5,
    date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    reviewText: text,
    comment: text,
    verifiedPurchase: Boolean(row.is_approved ?? row.approved ?? true),
    verified: Boolean(row.is_approved ?? row.approved ?? true),
    approved: Boolean(row.is_approved ?? row.approved),
  };
}
