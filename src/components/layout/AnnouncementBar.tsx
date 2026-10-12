import React, { useState, useEffect } from 'react';
import { Sparkles, Truck, ShieldCheck, Heart } from 'lucide-react';

const ANNOUNCEMENTS = [
  { text: 'Complimentary Express Shipping Across India on All Orders Above ₹5,000', icon: Truck },
  { text: 'Haute Couture Abayas Crafted with Fine Dubai & Indonesian Silk Fabrics', icon: Sparkles },
  { text: 'Engineered for South Indian Climate Comfort — Featherlight & Breathable', icon: ShieldCheck },
  { text: 'New Season Launch • Initial 4 Bespoke Designs Available Now', icon: Heart }
];

export const AnnouncementBar: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = ANNOUNCEMENTS[index].icon;

  return (
    <div className="bg-[#121212] text-[#FAF8F5] text-xs py-2.5 px-4 tracking-widest uppercase font-medium border-b border-[#2A2A2A] overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center transition-all duration-500 transform">
        <div className="flex items-center gap-2 space-x-1">
          <CurrentIcon className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span>{ANNOUNCEMENTS[index].text}</span>
        </div>
      </div>
    </div>
  );
};
