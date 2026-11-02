import React from 'react';
import { Instagram } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const InstagramGrid: React.FC = () => {
  const { products, isLoadingProducts, dbError } = useStore();
  const journalProducts = products
    .filter((product) => product.thumbnail?.trim() || product.image1?.trim() || product.images?.some((image) => image?.trim()))
    .slice(0, 6);

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

        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Loading social journal images">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="aspect-square rounded-xs bg-[#EAEAEA] animate-pulse" />
            ))}
          </div>
        ) : dbError ? (
          <p className="text-center text-sm text-[#777777]">Journal images are unavailable right now.</p>
        ) : journalProducts.length === 0 ? (
          <p className="text-center text-sm text-[#777777]">No product images available right now.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {journalProducts.map((product) => {
              const image = product.thumbnail?.trim() ||
                product.image1?.trim() ||
                product.images?.find((item) => item?.trim())?.trim();

              return (
                <a
                  key={product.id}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-xs overflow-hidden bg-[#121212] block"
                >
                  <img
                    src={image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-75"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[#121212]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#FCFCFA] gap-2 text-xs">
                    <Instagram className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                </a>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
