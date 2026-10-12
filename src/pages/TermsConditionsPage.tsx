import React from 'react';
import { CreditCard, Truck, RotateCcw, FileText, ShieldAlert, MessageCircle, Instagram } from 'lucide-react';

export const TermsConditionsPage: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] min-h-screen py-16 text-[#000000]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3 pb-8 border-b border-[#E8E5DD]">
          <span className="text-[10px] tracking-[0.35em] uppercase font-semibold text-[#8C7853] block">
            LaClassé Abaya — Legal Notice
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-wide text-[#000000]">
            Terms & Conditions
          </h1>
          <p className="text-xs text-[#555555] max-w-xl mx-auto">
            Premium modest wear for modern women. Please read these terms carefully before placing an order on our store.
          </p>
        </div>

        <div className="space-y-8 text-xs text-[#222222] leading-relaxed">
          
          {/* Item 1 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">1. Orders & Payment</h2>
            </div>
            <p className="text-[#444444]">
              All orders are <strong>Prepaid only</strong> (UPI, Debit/Credit Card, Netbanking, Razorpay). Orders are confirmed upon payment success.
            </p>
          </div>

          {/* Item 2 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">2. Shipping</h2>
            </div>
            <p className="text-[#444444]">
              Orders are processed within <strong>1–2 business days</strong> (3–5 days for custom orders). Shipped via <strong>DTDC/DHL</strong>. Delivery takes 3–7 business days across most of India.
            </p>
          </div>

          {/* Item 3 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">3. Exchange Policy</h2>
            </div>
            <p className="text-[#444444]">
              Size issue exchange only within <strong>3 days within India</strong>. Must be unworn with tags/packaging intact. Free 1-time pickup provided. Video proof (unboxing video) required within 24 hours for damaged/wrong items.
            </p>
          </div>

          {/* Item 4 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">4. Product Info</h2>
            </div>
            <p className="text-[#444444]">
              Colors may vary slightly due to digital studio lighting and individual device screen settings.
            </p>
          </div>

          {/* Item 5 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">5. Cancellation</h2>
            </div>
            <p className="text-[#444444]">
              Orders can be cancelled <strong>within 12 hours of placing</strong>.
            </p>
          </div>

          {/* Item 6 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <h2 className="font-serif text-xl font-medium text-[#000000]">6. Governing Law</h2>
            <p className="text-[#444444]">
              Governed by the <strong>Laws of India (Jurisdiction: Mangalore, Karnataka)</strong>.
            </p>
          </div>

          {/* Item 7 */}
          <div className="bg-[#000000] text-[#FFFFFF] p-6 rounded-xs space-y-4">
            <h2 className="font-serif text-xl font-medium text-[#E8E5DD]">7. Atelier Contact</h2>
            <p className="text-[#CCCCCC]">
              Contact us regarding any inquiries or order assistance:
            </p>
            <div className="flex flex-wrap gap-4 text-xs pt-1">
              <a
                href="https://wa.me/919380509397"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1eb354] text-white px-5 py-2.5 rounded-xs font-semibold flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: 9380509397</span>
              </a>
              <a
                href="https://www.instagram.com/laclasseabaya"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FFFFFF] text-[#000000] hover:bg-[#E8E5DD] px-5 py-2.5 rounded-xs font-semibold flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram: @laclasse.abaya</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
