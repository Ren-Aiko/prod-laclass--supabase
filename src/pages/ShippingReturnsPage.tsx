import React from 'react';
import { Truck, RotateCcw, CheckCircle2, MessageCircle, Instagram } from 'lucide-react';

export const ShippingReturnsPage: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] min-h-screen py-16 text-[#000000]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3 pb-8 border-b border-[#E8E5DD]">
          <span className="text-[10px] tracking-[0.35em] uppercase font-semibold text-[#8C7853] block">
            LaClassé Abaya — Client Care
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-wide text-[#000000]">
            Shipping & Return Policy
          </h1>
          <p className="text-xs text-[#555555] max-w-xl mx-auto">
            Premium modest wear for modern women. Please review our shipping schedules, payment guidelines, and size exchange terms.
          </p>
        </div>

        {/* Section 1: Shipping Policy */}
        <section className="bg-[#E8E5DD]/40 border border-[#E8E5DD] p-8 rounded-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-[#D8D4C8] pb-4">
            <Truck className="w-6 h-6 text-[#000000]" />
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#000000]">Shipping Policy</h2>
              <span className="text-[10px] text-[#666666] uppercase tracking-wider block">Domestic & Express Delivery</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#222222]">
            <div className="bg-[#FFFFFF] p-5 border border-[#E8E5DD] rounded-xs space-y-2">
              <strong className="text-[#000000] text-sm block font-serif">Order Processing Time</strong>
              <p className="leading-relaxed text-[#444444]">
                • Standard Orders: Processed within <strong>1–2 business days</strong>.<br />
                • Custom / Tailored Orders: Take <strong>3–5 business days</strong> for hand craft and precision tailoring.
              </p>
            </div>

            <div className="bg-[#FFFFFF] p-5 border border-[#E8E5DD] rounded-xs space-y-2">
              <strong className="text-[#000000] text-sm block font-serif">Shipping Partners</strong>
              <p className="leading-relaxed text-[#444444]">
                All shipments are dispatched via <strong>DTDC</strong> for pan-India coverage and <strong>DHL</strong> for express / premium locations.
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-6 border border-[#E8E5DD] rounded-xs space-y-3">
            <h3 className="font-serif text-base text-[#000000] font-medium">Estimated Delivery Timelines</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#E8E5DD]/30 border border-[#E8E5DD] rounded-xs">
                <span className="font-semibold block text-[#000000]">Metro Cities</span>
                <span className="text-[#555555]">3 – 5 Business Days</span>
              </div>
              <div className="p-3 bg-[#E8E5DD]/30 border border-[#E8E5DD] rounded-xs">
                <span className="font-semibold block text-[#000000]">Other Cities</span>
                <span className="text-[#555555]">5 – 7 Business Days</span>
              </div>
              <div className="p-3 bg-[#E8E5DD]/30 border border-[#E8E5DD] rounded-xs">
                <span className="font-semibold block text-[#000000]">Remote Areas</span>
                <span className="text-[#555555]">7 – 10 Business Days</span>
              </div>
            </div>
          </div>

          <div className="bg-[#000000] text-[#FFFFFF] p-6 rounded-xs space-y-2 text-xs">
            <strong className="text-[#E8E5DD] text-sm font-serif block">Payment Terms</strong>
            <p className="text-[#DDDDDD] leading-relaxed">
              <strong>COD (Cash on Delivery) is NOT available.</strong> We accept <strong>Prepaid payments only</strong> via UPI, Debit/Credit Cards, Netbanking, and Razorpay secure checkout.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#333333] pt-2">
            <CheckCircle2 className="w-5 h-5 text-[#8C7853]" />
            <span><strong>Order Tracking:</strong> Once your order is shipped, a direct shipment tracking link will be shared on your WhatsApp.</span>
          </div>
        </section>

        {/* Section 2: Return & Exchange Policy */}
        <section className="bg-[#E8E5DD]/40 border border-[#E8E5DD] p-8 rounded-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-[#D8D4C8] pb-4">
            <RotateCcw className="w-6 h-6 text-[#000000]" />
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#000000]">Return & Exchange Policy</h2>
              <span className="text-[10px] text-[#666666] uppercase tracking-wider block">India Only</span>
            </div>
          </div>

          <div className="space-y-4 text-xs text-[#222222] leading-relaxed">
            <div className="bg-[#FFFFFF] p-5 border border-[#E8E5DD] rounded-xs space-y-2">
              <strong className="text-[#000000] text-sm block font-serif">Exchange Only — Size Issue</strong>
              <p className="text-[#444444]">
                Exchange is available <strong>only for size issues within 3 days of delivery</strong> (India only).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#FFFFFF] p-5 border border-[#E8E5DD] rounded-xs space-y-2">
                <strong className="text-[#000000] text-xs font-semibold uppercase tracking-wider block">Conditions for Exchange</strong>
                <ul className="list-disc list-inside text-[#555555] space-y-1">
                  <li>Item must be unworn and unwashed.</li>
                  <li>Original tags and packaging must remain intact.</li>
                  <li><strong>One free exchange pickup provided:</strong> We cover shipping for size exchange.</li>
                </ul>
              </div>

              <div className="bg-[#FFFFFF] p-5 border border-[#E8E5DD] rounded-xs space-y-2">
                <strong className="text-[#000000] text-xs font-semibold uppercase tracking-wider block text-rose-800">Ineligible Items</strong>
                <p className="text-[#555555]">
                  No returns or exchanges for color change preference, worn items, custom orders, or damage due to customer use.
                </p>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-5 border-l-4 border-l-[#000000] border border-[#E8E5DD] rounded-xs space-y-2">
              <strong className="text-[#000000] text-xs font-semibold uppercase tracking-wider block">Damaged / Wrong Item Received?</strong>
              <p className="text-[#444444]">
                Please share an <strong>unboxing video within 24 hours of delivery</strong> to our WhatsApp team for an immediate replacement.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Support Banner */}
        <div className="bg-[#FFFFFF] border border-[#E8E5DD] p-8 rounded-xs text-center space-y-4">
          <h3 className="font-serif text-xl text-[#000000]">Need assistance with shipping or size exchange?</h3>
          <p className="text-xs text-[#666666]">
            Our support concierge is available via WhatsApp and Instagram DM.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="https://wa.me/919380509397"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1eb354] text-white px-6 py-3 rounded-xs text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: 9380509397</span>
            </a>
            <a
              href="https://www.instagram.com/laclasseabaya"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#000000] hover:bg-[#222222] text-white px-6 py-3 rounded-xs text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram: @laclasseabaya</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
