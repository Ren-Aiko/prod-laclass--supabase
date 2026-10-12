import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const TestimonialsSection: React.FC = () => {
  const { reviews } = useStore();
  const approvedReviews = reviews.filter(r => r.approved === true).slice(0, 3);

  return (
    <section className="py-20 bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-2">
            Client Accolades
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
            Words From Our Esteemed Patrons
          </h2>
          <div className="w-12 h-0.5 bg-[#121212] mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {approvedReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#FCFCFA] border border-[#F0ECE1] p-8 rounded-xs shadow-xs hover:border-[#D1CDC7] transition-all duration-300 flex flex-col justify-between relative"
            >
              <Quote className="w-8 h-8 text-[#E2DED6] absolute top-6 right-6" />

              <div className="space-y-4">
                <div className="flex text-[#D4AF37]">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating ? 'fill-current' : 'text-[#E0DCD3]'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-[#444444] leading-relaxed italic font-serif text-sm">
                  "{rev.reviewText}"
                </p>
              </div>

              <div className="pt-6 border-t border-[#F5F2EA] flex items-center justify-between mt-6">
                <div>
                  <h4 className="text-xs font-semibold text-[#121212]">
                    {rev.customerName}
                  </h4>
                  <span className="text-[10px] text-[#8C7853] font-medium">
                    {rev.productName}
                  </span>
                </div>

                {rev.verifiedPurchase && (
                  <div className="flex items-center gap-1 text-[10px] text-[#2e7d32] font-semibold bg-[#e8f5e9] px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
