import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Send, Quote } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getApprovedReviews } from '../services/review';
import { Review as DatabaseReview } from '../types/database';

export const ReviewsPage: React.FC = () => {
  const { reviews: contextReviews, addCustomerReview, products } = useStore();
  const [dbReviews, setDbReviews] = useState<DatabaseReview[]>([]);

  useEffect(() => {
    // Populate review cards directly using Stack A review service
    getApprovedReviews()
      .then((data) => {
        if (data && data.length > 0) {
          setDbReviews(data);
        }
      })
      .catch((err) => {
        console.warn('[ReviewsPage getApprovedReviews]:', err?.message);
      });
  }, []);

  const approvedReviews = dbReviews.length > 0
    ? dbReviews.map((r) => ({
        id: r.id,
        productId: r.product_id,
        productName: products.find((p) => p.id === r.product_id || p.product_id === r.product_id)?.name || 'Haute Couture Abaya',
        customerName: r.customer_name,
        rating: r.rating,
        reviewText: r.comment,
        date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        approved: r.approved,
        verifiedPurchase: r.verified_purchase,
      }))
    : contextReviews.filter((r) => r.approved === true);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || 'lc-001');
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewText.trim()) return;
    const prod = products.find((p) => p.id === selectedProductId);
    await addCustomerReview(selectedProductId, prod?.name || 'Laclassé Abaya', reviewerName, rating, reviewText);
    setSubmitted(true);
    setReviewerName('');
    setReviewText('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="bg-[#FCFCFA] min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block">
            Authentic Feedback
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#121212] font-medium tracking-wide">
            Client Reviews & Press
          </h1>
          <p className="text-xs text-[#666666]">
            Read verified reviews from clients across India who have experienced Laclassé luxury abayas.
          </p>
        </div>

        {/* Overall Rating Stats */}
        <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs mb-16 max-w-xl mx-auto text-center space-y-3">
          <div className="font-serif text-5xl font-semibold text-[#121212]">4.9 / 5.0</div>
          <div className="flex justify-center text-[#D4AF37]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <div className="text-xs text-[#666666]">Based on {approvedReviews.length} verified client reviews</div>
        </div>

        {/* Submit Review Section */}
        <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs mb-16 max-w-2xl mx-auto">
          <h3 className="font-serif text-2xl font-medium text-[#121212] mb-4">Share Your Laclassé Experience</h3>

          {submitted ? (
            <div className="bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] p-4 rounded-xs text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Thank you! Your review has been submitted for atelier approval.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#555555] mb-1 font-medium">Select Purchased Product *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-2 text-xs rounded-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#555555] mb-1 font-medium">Your Name *</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Suhana Parveen"
                    className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-2 text-xs rounded-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#555555] mb-1 font-medium">Rating *</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-2 text-xs rounded-xs"
                >
                  <option value={5}>5 Stars — Exceptional Quality</option>
                  <option value={4}>4 Stars — Very Good</option>
                  <option value={3}>3 Stars — Satisfactory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#555555] mb-1 font-medium">Your Review *</label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about the fabric texture, comfort in warm weather, and craftsmanship..."
                  className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-2 text-xs rounded-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Review</span>
              </button>
            </form>
          )}
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {approvedReviews.map((rev) => (
            <div key={rev.id} className="bg-[#FAF8F5] border border-[#F0ECE1] p-6 rounded-xs space-y-3 relative">
              <Quote className="w-6 h-6 text-[#E2DED6] absolute top-4 right-4" />
              <div className="flex text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-[#E0DCD3]'}`} />
                ))}
              </div>
              <p className="text-xs text-[#444444] leading-relaxed italic font-serif text-sm">"{rev.reviewText}"</p>
              <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#121212] block">{rev.customerName}</span>
                  <span className="text-[10px] text-[#8C7853]">{rev.productName}</span>
                </div>
                <span className="text-[10px] text-[#888888]">{rev.date}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
