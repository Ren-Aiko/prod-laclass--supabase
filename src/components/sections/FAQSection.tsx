import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const HOME_FAQS = [
  {
    category: 'Customization & Tailoring',
    q: 'Can I request custom tailoring or personalized lengths?',
    a: 'Yes! Custom orders take 3 to 5 business days to process. Simply select your closest standard size and share your length and chest preferences in order notes during checkout or directly via our WhatsApp concierge.'
  },
  {
    category: 'Payment Methods',
    q: 'What payment options do you accept?',
    a: 'We accept Prepaid payments only via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, Netbanking, and Razorpay. Cash on Delivery (COD) is strictly not available.'
  },
  {
    category: 'Shipping & Delivery',
    q: 'Which courier partners do you use for shipment?',
    a: 'We ship via DTDC Express for pan-India delivery and DHL Express for international locations. Order processing takes 1 to 2 business days for standard items and 3 to 5 business days for custom tailored garments.'
  },
  {
    category: 'Exchanges & Returns',
    q: 'What is your exchange and return policy?',
    a: 'We accept size exchange requests within 3 days of delivery for domestic orders. Garments must be unworn, unwashed, and in original packaging with tags intact. Returns and refunds are not offered unless you receive a damaged or incorrect product, which requires an unboxing video submitted within 24 hours.'
  },
  {
    category: 'Complementary Accessories',
    q: 'Do abayas include a matching Sheila scarf?',
    a: 'Yes, every LaClassé luxury abaya comes with a complimentary matching Sheila veil crafted from fine Korean chiffon or organza.'
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq-section" className="py-20 bg-[#FAF8F5] border-t border-[#F0ECE1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#8C7853]">
            <HelpCircle className="w-4 h-4" />
            <span className="text-[10px] tracking-[0.35em] uppercase font-medium">
              Client Assistance
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#666666] leading-relaxed">
            Essential information regarding our Dubai & Indonesian fabric origins, custom orders, shipping, and exchange policies.
          </p>
        </div>

        <div className="space-y-4">
          {HOME_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs overflow-hidden transition-all duration-200 shadow-xs"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-serif text-base sm:text-lg font-medium text-[#121212] hover:text-[#8C7853] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#8C7853] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[#555555] leading-relaxed border-t border-[#F5F2EA] bg-[#FCFCFA]">
                    <span className="text-[9px] font-semibold text-[#8C7853] uppercase tracking-widest block mb-1.5">
                      {faq.category}
                    </span>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
