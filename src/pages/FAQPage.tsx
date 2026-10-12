import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Ruler, Truck, RotateCcw, ShieldCheck } from 'lucide-react';

const FAQS = [
  {
    category: 'Sizing & Lengths',
    q: 'How do I choose the correct abaya length?',
    a: 'Abaya length is measured from the top of your shoulder down to your ankle. For height 5\'0"-5\'2" select 52", for 5\'3"-5\'4" select 54", for 5\'5"-5\'6" select 56", for 5\'7"-5\'8" select 58", and for 5\'9"+ select 60". If you wear high heels (3+ inches), choose 1 length size higher.'
  },
  {
    category: 'Sizing & Lengths',
    q: 'Can I request custom tailoring or custom length?',
    a: 'Yes! Custom orders take 3-5 business days to process. Simply select your closest standard size and provide your exact length/chest measurements in order notes or directly via WhatsApp concierge.'
  },
  {
    category: 'Payment Methods',
    q: 'What payment methods do you accept?',
    a: 'We accept Prepaid orders only via UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, Netbanking, and Razorpay. Cash on Delivery (COD) is strictly not available.'
  },
  {
    category: 'Shipping & Partners',
    q: 'Which courier partners do you use for delivery?',
    a: 'We ship via DTDC for pan-India orders and DHL for express/international locations. Order processing takes 1-2 business days (3-5 business days for custom orders).'
  },
  {
    category: 'Returns & Exchange Policy',
    q: 'What is your exchange and return policy?',
    a: 'We accept size issue exchanges within 3 days of delivery for orders within India. Garments must be unworn, unwashed, and in original packaging with tags intact. Returns/refunds are not offered unless you receive a damaged or incorrect product, which requires an unboxing video submitted within 24 hours.'
  },
  {
    category: 'Matching Sheila Scarf',
    q: 'Do abayas come with a matching scarf?',
    a: 'Yes, all LaClassé luxury abayas include a complimentary matching Sheila veil.'
  }
];

export const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-[#FCFCFA] min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block">
            Client Assistance
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#121212] font-medium tracking-wide">
            Frequently Asked Questions
          </h1>
          <p className="text-xs text-[#666666]">
            Find quick answers regarding our sizing, Dubai & Indonesian fabric origins, shipping, and returns.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#FAF8F5] border border-[#F0ECE1] rounded-xs overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-serif text-lg font-medium text-[#121212] hover:text-[#8C7853] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#8C7853] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="p-5 pt-0 text-xs text-[#555555] leading-relaxed border-t border-[#F0ECE1] bg-[#FCFCFA]">
                    <span className="text-[10px] font-semibold text-[#8C7853] uppercase tracking-widest block mb-1">
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
    </div>
  );
};
