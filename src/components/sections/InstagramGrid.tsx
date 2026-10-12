import React from 'react';
import { Instagram, Heart } from 'lucide-react';

const INSTA_POSTS = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563178406-4cdc2923acbc?q=80&w=600&auto=format&fit=crop'
];

export const InstagramGrid: React.FC = () => {
  return (
    <section className="py-20 bg-[#FCFCFA] border-t border-[#F0ECE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-2">
            Social Journal
          </span>
          <h2 className="font-serif text-3xl font-medium text-[#121212]">
            Follow @laclasse_couture
          </h2>
          <p className="text-xs text-[#666666] mt-2">
            Tag #LaclasseAbaya on Instagram to be featured in our fashion editorial gallery.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {INSTA_POSTS.map((img, idx) => (
            <a
              key={idx}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-xs overflow-hidden bg-[#121212] block"
            >
              <img
                src={img || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop'}
                alt="Laclassé Instagram Editorial"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-75"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#121212]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#FCFCFA] gap-2 text-xs">
                <Instagram className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
};
