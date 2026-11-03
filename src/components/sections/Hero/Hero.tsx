import React, { useEffect, useState } from 'react';
import { ArrowRight, Shield, Heart } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

interface HeroProps {
  onShopClick: () => void;
  onBridalClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onBridalClick }) => {
  const { products } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const heroImages = Array.from(
    new Map<string, { src: string; name: string }>(
      products
        .flatMap((product) => {
          const src = product.image2?.trim();
          return product.active && src ? [[src, { src, name: product.name }] as const] : [];
        })
    ).values()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    setCurrentImageIndex(0);
    if (heroImages.length < 2 || prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setCurrentImageIndex((index) => (index + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroImages.length, prefersReducedMotion]);

  return (
    <section className="relative bg-[#121212] text-[#F8F8F8] overflow-hidden min-h-[85vh] flex items-center">
      {/* Backend product image2 editorial slider */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-55">
        {heroImages.map((image, index) => {
          const offset = (index - currentImageIndex + heroImages.length) % heroImages.length;
          const translateX = offset === 0 ? 0 : offset === 1 ? 100 : -100;

          return (
            <img
              key={image.src}
              src={image.src}
              alt={`${image.name} editorial`}
              aria-hidden={offset !== 0}
              className={`absolute inset-0 h-full w-full object-cover object-top brightness-90 saturate-125 ${
                prefersReducedMotion ? 'transition-none' : 'transition-transform duration-1000 ease-in-out'
              }`}
              style={{ transform: `translateX(${translateX}%)` }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/95 via-[#121212]/60 to-[#B55232]/20 z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full">
        <div className="max-w-2xl space-y-6">
          
          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.08] tracking-wide text-[#F8F8F8]">
            Elegance <br />
            <span className="italic font-light rust-gradient-text">Redefined</span> for <br />
            the Modern Woman.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#CDCDCD] leading-relaxed max-w-lg font-light">
            Handcrafted luxury abayas crafted with pure Dubai Royal Nida & featherlight Indonesian Air-Flow Zoom silk. Designed for ultimate luxury & climate-engineered comfort.
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onShopClick}
              className="bg-[#F8F8F8] hover:bg-[#E8B7A5] text-[#121212] px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] rounded-xs transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
            >
              <span>Explore New Season</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onBridalClick}
              className="border border-[#B55232] hover:border-[#F8F8F8] text-[#F8F8F8] px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] rounded-xs transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
            >
              Bridal Collection
            </button>
          </div>

          {/* Brand Highlights */}
          <div className="pt-8 border-t border-[#2A2A2A] grid grid-cols-3 gap-4 text-[11px] text-[#9B9B9B] uppercase tracking-wider">
            <div>
              <strong className="text-[#F8F8F8] block font-semibold text-sm font-serif">100% Opaque</strong>
              Premium Breathable Weave
            </div>
            <div>
              <strong className="text-[#F8F8F8] block font-semibold text-sm font-serif">Custom Lengths</strong>
              52" to 60" Sizing Range
            </div>
            <div>
              <strong className="text-[#F8F8F8] block font-semibold text-sm font-serif">Express Shipping</strong>
              Free Across India & Gulf
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
