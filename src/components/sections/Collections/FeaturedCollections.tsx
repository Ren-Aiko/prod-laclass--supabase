import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { CategoryType, Product } from '../../../types';

interface FeaturedCollectionsProps {
  onSelectCategory: (category: CategoryType) => void;
}

interface CollectionCard {
  category: string;
  products: Product[];
  imageProduct?: Product;
}

export const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({ onSelectCategory }) => {
  const { products, isLoadingProducts, dbError } = useStore();
  const groupedCollections = new Map<string, CollectionCard>();
  for (const product of products) {
    const category = product.category?.trim();
    if (!category) continue;

    const collection: CollectionCard = groupedCollections.get(category) ?? { category, products: [] };
    collection.products.push(product);
    if (!collection.imageProduct && (product.thumbnail?.trim() || product.image1?.trim())) {
      collection.imageProduct = product;
    }
    groupedCollections.set(category, collection);
  }
  const collections = Array.from(groupedCollections.values());

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
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Loading collections">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-96 rounded-xs bg-[#EAEAEA] animate-pulse" />
            ))}
          </div>
        ) : dbError ? (
          <p className="text-center text-sm text-[#777777]">Collections are unavailable right now.</p>
        ) : collections.length === 0 ? (
          <p className="text-center text-sm text-[#777777]">No collections available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {collections.map((collection) => {
              const image = collection.imageProduct?.thumbnail || collection.imageProduct?.image1;

              return (
                <div
                  key={collection.category}
                  onClick={() => onSelectCategory(collection.category)}
                  className="group cursor-pointer relative h-96 rounded-xs overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-[#121212]"
                >
                  {image && (
                    <img
                      src={image}
                      alt={`${collection.category} collection`}
                      className="w-full h-full object-cover object-center opacity-85 group-hover:scale-110 group-hover:opacity-75 transition-all duration-700 ease-out"
                      loading="lazy"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/30 to-transparent z-10" />

                  <div className="absolute inset-0 p-6 z-20 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="bg-[#121212]/80 backdrop-blur-md text-[#FCFCFA] text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-xs">
                        {collection.products.length} {collection.products.length === 1 ? 'Design' : 'Designs'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#FCFCFA]/90 text-[#121212] flex items-center justify-center group-hover:bg-[#8C7853] group-hover:text-[#FCFCFA] transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-serif text-2xl text-[#FCFCFA] font-medium mb-1 group-hover:text-[#D4AF37] transition-colors">
                        {collection.category}
                      </h3>
                      <p className="text-xs text-[#D1CDC7] font-light leading-relaxed line-clamp-2">
                        Explore our {collection.category} designs.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
