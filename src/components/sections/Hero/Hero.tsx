import React from 'react';
import { ArrowRight, Sparkles, Shield, Heart } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onBridalClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onBridalClick }) => {
  return (
    <section className="relative bg-[#121212] text-[#FAF8F5] overflow-hidden min-h-[85vh] flex items-center">
      {/* Background Editorial Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity">
        <img
          src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1920&auto=format&fit=crop"
          alt="Laclassé Haute Couture Abaya"
          className="w-full h-full object-cover object-top filter brightness-75 scale-105 animate-pulse duration-[10000ms]"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/80 to-transparent z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full">
        <div className="max-w-2xl space-y-6">
          
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 border border-[#8C7853] bg-[#8C7853]/15 px-3.5 py-1.5 rounded-full text-xs tracking-[0.25em] uppercase text-[#D4AF37] font-medium backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dubai & Indonesian Fine Silk Couture</span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.08] tracking-wide text-[#FAF8F5]">
            Elegance <br />
            <span className="italic font-light gold-gradient-text">Redefined</span> for <br />
            the Modern Woman.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#D1CDC7] leading-relaxed max-w-lg font-light">
            Handcrafted luxury abayas crafted with pure Dubai Royal Nida & featherlight Indonesian Air-Flow Zoom silk. Designed for ultimate luxury & climate-engineered comfort.
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onShopClick}
              className="bg-[#FAF8F5] hover:bg-[#D4AF37] text-[#121212] px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] rounded-xs transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
            >
              <span>Explore New Season</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onBridalClick}
              className="border border-[#8C7853] hover:border-[#FAF8F5] text-[#FAF8F5] px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] rounded-xs transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
            >
              Bridal Collection
            </button>
          </div>

          {/* Brand Highlights */}
          <div className="pt-8 border-t border-[#2A2A2A] grid grid-cols-3 gap-4 text-[11px] text-[#A09A92] uppercase tracking-wider">
            <div>
              <strong className="text-[#FAF8F5] block font-semibold text-sm font-serif">100% Opaque</strong>
              Premium Breathable Weave
            </div>
            <div>
              <strong className="text-[#FAF8F5] block font-semibold text-sm font-serif">Custom Lengths</strong>
              52" to 60" Sizing Range
            </div>
            <div>
              <strong className="text-[#FAF8F5] block font-semibold text-sm font-serif">Express Shipping</strong>
              Free Across India & Gulf
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
