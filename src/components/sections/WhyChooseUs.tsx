import React from 'react';
import { Sparkles, ShieldCheck, Sun, Truck } from 'lucide-react';

const PILLARS = [
  {
    icon: Sparkles,
    title: 'Fabrics That Feel as Good as They Look',
    description: 'Premium Korean Nida, crepe and chiffon that drape softly and never cling.'
  },
  {
    icon: ShieldCheck,
    title: 'Details Placed by Hand',
    description: 'Stonework, embroidery and lace finished with care, never heavy and never overwhelming.'
  },
  {
    icon: Sun,
    title: 'Made to Fit You',
    description: 'Custom measurements and sizes from 52″ to 60″ for a graceful, modest drape.'
  },
  {
    icon: Truck,
    title: 'Complimentary Express Pan-India Delivery',
    description: 'Orders above ₹5,000 ship via express air logistics with live tracking and luxury custom gift packaging.'
  }
];

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="py-20 bg-[#FCFCFC] border-y border-[#ECECEC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.35em] text-[#B55232] uppercase font-medium block mb-2">
            The Atelier Promise
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
            The LaClassé Difference
          </h2>
          <div className="w-12 h-0.5 bg-[#121212] mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#F8F8F8] border border-[#ECECEC] p-8 rounded-xs hover:border-[#CDCDCD] transition-all duration-300 space-y-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#121212] text-[#E8B7A5] flex items-center justify-center group-hover:scale-110 transition-transform">
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
