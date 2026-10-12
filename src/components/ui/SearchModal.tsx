import React from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';

interface SearchModalProps {
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  onSelectProduct
}) => {
  const { searchQuery, setSearchQuery, filteredProducts, isSearchOpen, setIsSearchOpen } = useStore();

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121212]/80 backdrop-blur-md flex flex-col items-center pt-16 px-4">
      <div 
        className="w-full max-w-3xl bg-[#FCFCFA] rounded-xs shadow-2xl border border-[#EAEAEA] p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4 mb-6">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <Search className="w-5 h-5 text-[#8C7853]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search abayas by name, fabric (e.g. Dubai Nida, Zoom), or collection..."
              className="w-full text-sm sm:text-base bg-transparent text-[#121212] focus:outline-none placeholder-[#888888]"
              autoFocus
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setIsSearchOpen(false);
            }}
            className="p-1 text-[#121212] hover:text-[#8C7853]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {searchQuery.trim() === '' ? (
            <div className="text-center py-8 text-xs text-[#888888]">
              Type above to search across our luxury abaya catalog.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#888888]">
              No abayas matching "{searchQuery}" found. Try "Dubai", "Silk", "Bridal", or "Casual".
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  onSelectProduct(product);
                  setIsSearchOpen(false);
                }}
                className="flex items-center gap-4 p-3 hover:bg-[#F5F2EA] rounded-xs cursor-pointer transition-colors border border-transparent hover:border-[#EAEAEA]"
              >
                <img
                  src={product.thumbnail || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop'}
                  alt={product.name || 'Product'}
                  className="w-12 h-16 object-cover rounded-xs"
                />
                <div className="flex-1">
                  <div className="text-[10px] uppercase text-[#8C7853] tracking-widest font-medium">
                    {product.collection} • {product.fabric}
                  </div>
                  <h4 className="font-serif text-sm font-medium text-[#121212]">
                    {product.name}
                  </h4>
                  <div className="text-xs font-semibold text-[#121212] mt-0.5">
                    ₹{(product.offerPrice ?? product.price).toLocaleString('en-IN')}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8C7853]" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
