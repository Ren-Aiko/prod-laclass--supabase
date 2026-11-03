import React, { useState } from 'react';
import { Mail, Instagram, MessageCircle, ArrowRight, CheckCircle2, Copy, Check, Info, Sparkles, Loader2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { subscribeAndGenerateCoupon } from '../../services/coupon';
import { SubscribeResult } from '../../types';
import logo from '../../assets/SVG-02 (12)-Photoroom.png';

interface FooterProps {
  setActiveTab?: (tab: string) => void;
  onNavigate?: (page: string) => void;
  onSelectCategory?: (category: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab, onNavigate, onSelectCategory }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subResult, setSubResult] = useState<SubscribeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { subscribeNewsletter } = useStore();

  const handleTab = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setIsSubmitting(true);
    setCopied(false);
    try {
      // Call subscribeAndGenerateCoupon from backend service layer
      const couponCode = await subscribeAndGenerateCoupon(email.trim());
      setSubResult({
        success: true,
        alreadySubscribed: false,
        couponCode,
        message: 'Welcome to the atelier! Your exclusive 10% discount code is generated below.'
      });
      setEmail('');
    } catch (err: any) {
      setSubResult({
        success: false,
        alreadySubscribed: false,
        message: err.message || 'Failed to subscribe. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <footer className="bg-[#121212] text-[#E0E0E0] pt-16 pb-12 border-t border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Newsletter Section */}
        <div className="bg-[#1B1B1B] border border-[#2B2B2B] rounded-xs p-8 md:p-12 mb-16 relative overflow-hidden">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-[10px] tracking-[0.35em] text-[#E8B7A5] uppercase font-medium block mb-2">
              The Laclassé Atelier Privé
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-[#F8F8F8] mb-3 tracking-wide">
              Subscribe for Exclusive Haute Couture Pre-Orders & Private Collections
            </h3>
            <p className="text-xs text-[#9B9B9B] mb-6 leading-relaxed">
              Join our mailing list to receive complimentary fashion preview invites, private discount codes, and direct notifications for new Dubai & Indonesian silk drops.
            </p>

            {subResult?.alreadySubscribed ? (
              <div className="bg-[#1D1D1D] border border-[#E8B7A5]/40 text-[#F8F8F8] p-5 rounded-xs text-xs space-y-2 relative">
                <button
                  onClick={() => setSubResult(null)}
                  className="absolute top-2.5 right-2.5 text-[#9B9B9B] hover:text-[#F8F8F8] p-1 transition-colors"
                  title="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-2 text-[#E8B7A5]">
                  <Info className="w-4.5 h-4.5" />
                  <span className="font-medium tracking-wide">Already Subscribed</span>
                </div>
                <p className="text-[#C0C0C0] text-xs leading-relaxed">
                  You are already subscribed to our Newsletter. You will continue to receive our exclusive atelier updates!
                </p>
              </div>
            ) : subResult?.success && subResult.couponCode ? (
              <div className="bg-[#1D1D1D] border border-[#B55232] text-[#F8F8F8] p-6 rounded-xs text-xs space-y-4 relative">
                <button
                  onClick={() => setSubResult(null)}
                  className="absolute top-2.5 right-2.5 text-[#9B9B9B] hover:text-[#F8F8F8] p-1 transition-colors"
                  title="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-center justify-center gap-2 text-[#E8B7A5]">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-serif text-lg font-medium tracking-wide text-[#F8F8F8]">
                    Welcome to Laclassé Privé!
                  </span>
                </div>

                <p className="text-[#C0C0C0] text-xs">
                  Thank you for subscribing! Here is your unique 10% welcome discount code:
                </p>

                <div className="inline-flex items-center justify-between gap-4 bg-[#121212] border border-[#E8B7A5]/60 px-4 py-2.5 rounded-xs max-w-sm mx-auto w-full sm:w-auto">
                  <span className="font-mono text-sm tracking-widest font-bold text-[#E8B7A5]">
                    {subResult.couponCode}
                  </span>
                  <button
                    onClick={() => copyCouponCode(subResult.couponCode!)}
                    className="bg-[#B55232] hover:bg-[#B55232] text-[#F8F8F8] px-3.5 py-1.5 rounded-xs text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#C8C8C8]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#9B9B9B] italic">
                  Apply code <strong className="text-[#E8B7A5] not-italic">{subResult.couponCode}</strong> at checkout for 10% off your order. Valid for 30 days.
                </p>
              </div>
            ) : subResult && !subResult.success ? (
              <div className="bg-[#1D1D1D] border border-[#E8B7A5] text-[#F8F8F8] p-4 rounded-xs text-xs space-y-2 relative">
                <button
                  onClick={() => setSubResult(null)}
                  className="absolute top-2.5 right-2.5 text-[#9B9B9B] hover:text-[#F8F8F8] p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-[#FFF4F0]">{subResult.message}</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-[#121212] border border-[#383838] text-[#F8F8F8] px-4 py-3 text-xs placeholder-[#666666] focus:outline-none focus:border-[#E8B7A5] rounded-xs transition-colors"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#B55232] hover:bg-[#B55232] text-[#F8F8F8] text-xs font-medium uppercase tracking-[0.2em] px-6 py-3 rounded-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <span>Subscribe</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#262626]">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <button
              onClick={() => { handleTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-left focus:outline-none block group"
              aria-label="LaClassé Home"
            >
              <img
                src={logo}
                alt="LA.CLASSÈ"
                className="h-24 md:h-26 w-auto object-contain brightness-0 invert opacity-95 group-hover:opacity-100 transition-opacity"
              />
            </button>
            <span className="text-[10px] tracking-[0.3em] text-[#E8B7A5] uppercase block font-light -mt-1">
              Premium modest wear for modern women
            </span>
            <p className="text-xs text-[#999999] leading-relaxed max-w-sm pt-2">
              LaClassé Abaya offers elegant, minimal, and premium abayas crafted with fine fabrics for modern women. Designed for timeless modesty and effortless style.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <a
                href="https://www.instagram.com/laclasseabaya"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#A9A9A9] hover:text-[#F8F8F8] hover:bg-[#B55232] transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/919380509397"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#A9A9A9] hover:text-white hover:bg-[#25D366] transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8F8F8] uppercase tracking-[0.2em] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs text-[#9B9B9B]">
              <li>
                <button onClick={() => { handleTab('shop'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Shop All Abayas
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('collections'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Featured Collections
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('order-status'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Check Order Status
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('about'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Our Brand Story
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('reviews'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Client Reviews & Press
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies & Legal */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8F8F8] uppercase tracking-[0.2em] mb-4">
              Policies
            </h4>
            <ul className="space-y-2.5 text-xs text-[#9B9B9B]">
              <li>
                <button onClick={() => { handleTab('shipping-returns'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Shipping & Return Policy
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('privacy-policy'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('terms-conditions'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Assistance */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8F8F8] uppercase tracking-[0.2em] mb-4">
              Client Service
            </h4>
            <ul className="space-y-2.5 text-xs text-[#9B9B9B]">
              <li>
                <button onClick={() => { handleTab('faq'); }} className="hover:text-[#F8F8F8] transition-colors">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button onClick={() => { handleTab('contact'); window.scrollTo(0,0); }} className="hover:text-[#F8F8F8] transition-colors">
                  Contact Concierge
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#777777] gap-4">
          <div>
            © 2026 LaClassé Abaya. All Rights Reserved. Premium modest wear for modern women.
          </div>
          <div className="flex items-center space-x-6">
            <span>Prepaid Only</span>
            <span>•</span>
            <span>DTDC & DHL Express</span>
            <span>•</span>
            <span>UPI / Razorpay Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
