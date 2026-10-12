import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CategoryType } from '../../../types';

interface FeaturedCollectionsProps {
  onSelectCategory: (category: CategoryType) => void;
}

const COLLECTIONS = [
  {
    id: 'Bridal' as CategoryType,
    name: 'Bridal Couture',
    tagline: 'Hand-sewn Swarovski crystals & French organza overlays for weddings',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
    count: '3 Masterpieces'
  },
  {
    id: 'Premium' as CategoryType,
    name: 'Dubai Royal Premium',
    tagline: 'Sourced from Deira, Dubai. Anti-static Royal Nida with gold zari',
    image: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=800&auto=format&fit=crop',
    count: '4 Designs'
  },
  {
    id: 'Casual' as CategoryType,
    name: 'Indonesian Breeze Casual',
    tagline: 'Bandung Air-Flow Zoom & washed linen with functional pockets',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
    count: '3 Designs'
  }
];

export const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({ onSelectCategory }) => {
  return (
    <section className="py-20 bg-[#FCFCFA] border-b border-[#F0ECE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-2">
            Curated Atelier Selections
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
            Explore Featured Collections
          </h2>
          <div className="w-12 h-0.5 bg-[#121212] mx-auto mt-4" />
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLLECTIONS.map((col) => (
            <div
              key={col.id}
              onClick={() => onSelectCategory(col.id)}
              className="group cursor-pointer relative h-96 rounded-xs overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-[#121212]"
            >
              <img
                src={col.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop'}
                alt={col.name || 'Collection'}
                className="w-full h-full object-cover object-center opacity-85 group-hover:scale-110 group-hover:opacity-75 transition-all duration-700 ease-out"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/30 to-transparent z-10" />

              <div className="absolute inset-0 p-6 z-20 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="bg-[#121212]/80 backdrop-blur-md text-[#FCFCFA] text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-xs">
                    {col.count}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#FCFCFA]/90 text-[#121212] flex items-center justify-center group-hover:bg-[#8C7853] group-hover:text-[#FCFCFA] transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-2xl text-[#FCFCFA] font-medium mb-1 group-hover:text-[#D4AF37] transition-colors">
                    {col.name}
                  </h3>
                  <p className="text-xs text-[#D1CDC7] font-light leading-relaxed line-clamp-2">
                    {col.tagline}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
