import React from 'react';
import { Sparkles, ShieldCheck, Sun, Truck } from 'lucide-react';

const PILLARS = [
  {
    icon: Sparkles,
    title: 'Sourced Dubai & Indonesian Fine Silk',
    description: 'We directly import original Dubai Royal Nida and Bandung Air-Flow Zoom silk from renowned textile houses in Deira and Indonesia.'
  },
  {
    icon: Sun,
    title: 'Engineered for South Indian Climate',
    description: 'Specially constructed micro-weave fabrics that feel featherlight, cool against the skin, and completely opaque even in humid weather.'
  },
  {
    icon: ShieldCheck,
    title: 'Haute Couture Precision Sizing',
    description: 'Every abaya is tailored with customized length selections from 52" to 60" ensuring graceful, modest drapes.'
  },
  {
    icon: Truck,
    title: 'Complimentary Express Pan-India Delivery',
    description: 'Orders above ₹5,000 ship via express air logistics with live tracking and luxury custom gift packaging.'
  }
];

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="py-20 bg-[#FCFCFA] border-y border-[#F0ECE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-2">
            The Atelier Promise
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
            Why Discerning Clients Choose Laclassé
          </h2>
          <div className="w-12 h-0.5 bg-[#121212] mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs hover:border-[#D1CDC7] transition-all duration-300 space-y-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#121212] text-[#D4AF37] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-medium text-[#121212]">
                  {p.title}
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
