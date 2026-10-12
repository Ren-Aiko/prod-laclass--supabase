import React from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { ProductCard } from '../../cards/ProductCard';
import { Product } from '../../../types';

interface NewArrivalsProps {
  onSelectProduct: (product: Product) => void;
  onViewAllClick: () => void;
}

export const NewArrivals: React.FC<NewArrivalsProps> = ({ onSelectProduct, onViewAllClick }) => {
  const { products, isLoadingProducts, dbError } = useStore();
  const featuredList = products.filter(p => p.featured || p.newArrival).slice(0, 4);

  return (
    <section className="py-20 bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 border-b border-[#EAEAEA] pb-6">
          <div>
            <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-1">
              Initial Season Launch
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium tracking-wide">
              New Arrivals & Signature Bespoke Pieces
            </h2>
          </div>

          <button
            onClick={onViewAllClick}
            className="mt-4 md:mt-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#121212] hover:text-[#8C7853] transition-colors flex items-center gap-2 group cursor-pointer"
          >
            <span>View All Products ({products.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Product Grid Area */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-[#FCFCFA] aspect-[3/4] rounded-xs animate-pulse border border-[#EAEAEA]" />
            ))}
          </div>
        ) : dbError ? (
          <div className="text-center py-16 px-4 bg-[#FCFCFA] border border-[#F0ECE1] rounded-xs space-y-4">
            <AlertCircle className="w-10 h-10 text-[#8C7853] mx-auto stroke-1" />
            <h3 className="font-serif text-xl text-[#121212] font-medium">
              Trouble connecting to our servers. Please try our WhatsApp.
            </h3>
            <p className="text-xs text-[#777777] max-w-sm mx-auto">
              Our concierge atelier is available on WhatsApp to assist with immediate orders and inquiries.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/919380509397?text=Hello%20LaClass%C3%A9%20Abaya%20Concierge!%20I%20would%20like%20to%20inquire%20about%20your%20luxury%20collections."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-medium uppercase tracking-[0.2em] px-5 py-2.5 rounded-xs transition-colors shadow-sm"
              >
                <span>WhatsApp Concierge</span>
              </a>
              <button
                onClick={onViewAllClick}
                className="inline-flex items-center gap-2 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] text-xs font-medium uppercase tracking-[0.2em] px-5 py-2.5 rounded-xs transition-colors cursor-pointer"
              >
                <span>View Catalogue</span>
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#FCFCFA] border border-[#F0ECE1] rounded-xs space-y-3">
            <AlertCircle className="w-10 h-10 text-[#8C7853] mx-auto stroke-1" />
            <h3 className="font-serif text-xl text-[#121212] font-medium">
              No products available right now.
            </h3>
            <p className="text-xs text-[#777777] max-w-sm mx-auto">
              Our haute couture collections are currently being prepared for the upcoming season.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(featuredList.length > 0 ? featuredList : products.slice(0, 4)).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
