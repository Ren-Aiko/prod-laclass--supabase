import React from 'react';
import { Sparkles, Sun, ShieldCheck, Heart, ArrowRight } from 'lucide-react';

interface AboutPageProps {
  onExploreShop: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onExploreShop }) => {
  return (
    <div className="bg-[#FCFCFA] min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Story Banner */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block">
            Our Brand Story
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl text-[#121212] font-normal tracking-wide">
            The LaClassé Abaya Story
          </h1>
          <p className="text-sm text-[#555555] leading-relaxed max-w-2xl mx-auto">
            LaClassé Abaya was born out of a passion to create premium modest wear for modern women, harmonizing timeless elegance with superior fabric quality and graceful cuts.
          </p>
        </div>

        {/* Hero Editorial Image Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-20 bg-[#FAF8F5] border border-[#F0ECE1] p-8 md:p-12 rounded-xs">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7853] font-semibold">
              Crafted For Comfort
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium leading-snug">
              Dubai Luxury Meets South Indian Climate Comfort
            </h2>
            <p className="text-xs text-[#555555] leading-relaxed">
              Traditional heavy abayas often prove uncomfortable in South India's warm, humid weather. At Laclassé, we spent months testing and sourcing lightweight, moisture-wicking Zoom fabrics from Bandung, Indonesia, and high-density anti-static Royal Nida from Deira, Dubai.
            </p>
            <p className="text-xs text-[#555555] leading-relaxed">
              The result is a collection of abayas that feel featherlight against the skin while remaining 100% opaque, wrinkle-resistant, and gracefully draped.
            </p>

            <button
              onClick={onExploreShop}
              className="bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center gap-2"
            >
              <span>Explore The Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
              alt="Laclassé Fabric Tailoring"
              className="w-full h-80 object-cover rounded-xs shadow-md"
            />
            <img
              src="https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=800&auto=format&fit=crop"
              alt="Laclassé Abaya Detail"
              className="w-full h-80 object-cover rounded-xs shadow-md mt-6"
            />
          </div>
        </div>

        {/* 3 Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs space-y-3">
            <Sparkles className="w-8 h-8 text-[#8C7853]" />
            <h3 className="font-serif text-xl font-medium text-[#121212]">Curated Sourcing</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              We work directly with textile artisans in Dubai and Indonesia, hand-selecting every roll of Nida, Zoom, and liquid silk satin.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs space-y-3">
            <Sun className="w-8 h-8 text-[#8C7853]" />
            <h3 className="font-serif text-xl font-medium text-[#121212]">Climate Engineering</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              Every garment is lightweight, breathable, and pre-tested to withstand humidity without clinging or sacrificing opacity.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#8C7853]" />
            <h3 className="font-serif text-xl font-medium text-[#121212]">Tailored Precision</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              Precision lengths ranging from 52 to 60 inches tailored specifically for teenagers, college students, and women.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
