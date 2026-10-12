import React from 'react';
import { ShieldCheck, Lock, Eye, Cookie, MessageCircle, Instagram } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] min-h-screen py-16 text-[#000000]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3 pb-8 border-b border-[#E8E5DD]">
          <span className="text-[10px] tracking-[0.35em] uppercase font-semibold text-[#8C7853] block">
            LaClassé Abaya — Data Protection
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-wide text-[#000000]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#555555] max-w-xl mx-auto">
            Premium modest wear for modern women. We respect your privacy and are committed to protecting your personal data.
          </p>
        </div>

        <div className="space-y-8 text-xs text-[#222222] leading-relaxed">
          
          {/* Item 1 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">1. Information We Collect</h2>
            </div>
            <p className="text-[#444444]">
              We collect information that you provide when placing an order or communicating with us, including your <strong>Name, Phone number, Email address, Shipping Address, Order details, and Payment information</strong>.
            </p>
            <p className="text-[#666666] bg-[#FFFFFF] p-3 border border-[#E8E5DD] rounded-xs">
              <strong>Note on Payment Security:</strong> All payment details are processed securely by our verified payment gateway. <strong>We do not store card/UPI details.</strong>
            </p>
          </div>

          {/* Item 2 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">2. How We Use Information</h2>
            </div>
            <p className="text-[#444444]">
              Your information is used strictly to:
            </p>
            <ul className="list-disc list-inside text-[#444444] space-y-1.5 pl-2">
              <li>Process, confirm, and fulfill your abaya orders.</li>
              <li>Arrange shipping via DTDC or DHL.</li>
              <li>Send automated order and shipping updates via WhatsApp.</li>
              <li>Provide client support and respond to custom tailoring inquiries.</li>
              <li>Improve the shopping experience and browsing performance.</li>
            </ul>
          </div>

          {/* Item 3 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">3. Data Sharing</h2>
            </div>
            <p className="text-[#444444]">
              We only share name, address, and phone number with courier partners (<strong>DTDC/DHL</strong>) to ensure safe and timely delivery.
            </p>
            <p className="font-semibold text-[#000000]">
              We do not sell or rent personal data to third parties under any circumstances.
            </p>
          </div>

          {/* Item 4 */}
          <div className="bg-[#E8E5DD]/30 border border-[#E8E5DD] p-6 rounded-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Cookie className="w-5 h-5 text-[#000000]" />
              <h2 className="font-serif text-xl font-medium text-[#000000]">4. Cookies & Data Security</h2>
            </div>
            <p className="text-[#444444]">
              <strong>Cookies:</strong> Used for analytics and improving the browsing experience.
            </p>
            <p className="text-[#444444]">
              <strong>Data Security:</strong> Industry-standard security practices applied across all data storage and client communication channels.
            </p>
          </div>

          {/* Item 5 */}
          <div className="bg-[#000000] text-[#FFFFFF] p-6 rounded-xs space-y-4">
            <h2 className="font-serif text-xl font-medium text-[#E8E5DD]">5. Privacy Inquiries & Contact</h2>
            <p className="text-[#CCCCCC]">
              If you have any questions or requests regarding your personal data, reach out directly:
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
                <span>DM @laclasse.abaya</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
