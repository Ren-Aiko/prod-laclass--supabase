import React, { useState, useEffect } from 'react';
import { Filter, SlidersHorizontal, Search, RotateCcw, X, Grid, List, AlertCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/cards/ProductCard';
import { Product } from '../types';
import { getActiveProducts } from '../services/product';

interface ShopPageProps {
  onSelectProduct: (product: Product) => void;
}

const FABRICS = ['All', 'Dubai Nida', 'Indonesian Zoom', 'Silk Satin', 'Korean Chiffon', 'Linen Cotton', 'Organza Silk'];

export const ShopPage: React.FC<ShopPageProps> = ({ onSelectProduct }) => {
  const {
    products,
    categories,
    isLoadingProducts,
    dbError,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedFabric,
    setSelectedFabric,
    priceRange,
    setPriceRange,
    sortOption,
    setSortOption,
    refreshStoreData
  } = useStore();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    // Proactively fetch catalog items using getActiveProducts from Stack A product service
    getActiveProducts()
      .then((data) => {
        if (data && data.length > 0 && products.length === 0) {
          refreshStoreData();
        }
      })
      .catch((err) => {
        console.warn('[ShopPage getActiveProducts ping]:', err?.message);
      });
  }, []);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedFabric('All');
    setPriceRange([0, 50000]);
    setSortOption('featured');
  };

  const hasActiveFilters = 
    selectedCategory !== 'All' || 
    selectedFabric !== 'All' || 
    searchQuery !== '' || 
    priceRange[1] < 50000 || 
    priceRange[0] > 0;

  return (
    <div className="bg-[#FCFCFA] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block mb-1">
            Bespoke Fashion Catalog
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#121212] font-medium tracking-wide">
            Haute Couture Abayas
          </h1>
          <p className="text-xs text-[#666666] mt-2">
            {products.length > 0 
              ? `Showing ${filteredProducts.length} of ${products.length} luxury abayas crafted with Dubai & Indonesian fine fabrics.`
              : 'Handcrafted luxury abayas tailored with premier fabrics.'}
          </p>
        </div>

        {/* Top Controls Bar */}
        <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-4 rounded-xs mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, fabric, or category..."
              className="w-full bg-[#FCFCFA] border border-[#D1CDC7] pl-9 pr-4 py-2 text-xs rounded-xs text-[#121212] focus:outline-none focus:border-[#121212]"
            />
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#888888] hover:text-[#121212]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 bg-[#121212] text-[#FCFCFA] px-4 py-2 rounded-xs text-xs uppercase tracking-wider font-medium"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
              <span>Filter ({hasActiveFilters ? 'Active' : 'All'})</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#666666] font-medium hidden sm:inline">Sort By:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-2 rounded-xs text-xs text-[#121212] focus:outline-none focus:border-[#121212] font-medium"
              >
                <option value="featured">Featured Collection</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <span className="text-[#888888] text-[11px] font-medium uppercase tracking-wider">Filters:</span>
            
            {selectedCategory !== 'All' && (
              <span className="bg-[#121212] text-[#FCFCFA] px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px]">
                Category: {selectedCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('All')} />
              </span>
            )}

            {selectedFabric !== 'All' && (
              <span className="bg-[#121212] text-[#FCFCFA] px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px]">
                Fabric: {selectedFabric}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedFabric('All')} />
              </span>
            )}

            {priceRange[1] < 50000 && (
              <span className="bg-[#121212] text-[#FCFCFA] px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px]">
                Under ₹{priceRange[1].toLocaleString('en-IN')}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([0, 50000])} />
              </span>
            )}

            <button
              onClick={resetFilters}
              className="text-[#990000] hover:underline text-xs flex items-center gap-1 ml-2 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        )}

        {/* Main Content Layout (Left Filter Sidebar + Right Product Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-8 bg-[#FAF8F5] p-6 border border-[#F0ECE1] rounded-xs h-fit sticky top-24">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA]">
              <h3 className="font-serif text-lg font-medium text-[#121212]">Refine Catalog</h3>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-[11px] text-[#8C7853] hover:underline">
                  Reset
                </button>
              )}
            </div>

            {/* Dynamic Categories Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#121212] mb-3">Categories</h4>
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left text-xs py-1.5 px-3 rounded-xs transition-colors cursor-pointer ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#121212] text-[#FCFCFA] font-semibold'
                        : 'text-[#555555] hover:bg-[#F0ECE1] hover:text-[#121212]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric Origin Filter */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#121212] mb-3">Fabric Origin</h4>
              <div className="space-y-1.5">
                {FABRICS.map((fab) => (
                  <button
                    key={fab}
                    onClick={() => setSelectedFabric(fab)}
                    className={`w-full text-left text-xs py-1.5 px-3 rounded-xs transition-colors cursor-pointer ${
                      selectedFabric === fab
                        ? 'bg-[#121212] text-[#FCFCFA] font-semibold'
                        : 'text-[#555555] hover:bg-[#F0ECE1] hover:text-[#121212]'
                    }`}
                  >
                    {fab}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                <span>Max Price:</span>
                <span className="text-[#8C7853]">₹{priceRange[1].toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="3000"
                max="50000"
                step="500"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full accent-[#121212] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#888888] mt-1">
                <span>₹3,000</span>
                <span>₹50,000+</span>
              </div>
            </div>

          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {isLoadingProducts ? (
              /* Loading Skeleton */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-[#FAF8F5] border border-[#F0ECE1] aspect-[3/4] rounded-xs animate-pulse p-4 flex flex-col justify-end">
                    <div className="h-4 bg-[#EAEAEA] rounded-xs w-3/4 mb-2" />
                    <div className="h-3 bg-[#EAEAEA] rounded-xs w-1/2" />
                  </div>
                ))}
              </div>
            ) : dbError ? (
              /* Backend or Database Connection Failure */
              <div className="text-center py-20 px-6 bg-[#FAF8F5] border border-[#F0ECE1] rounded-xs space-y-4">
                <AlertCircle className="w-12 h-12 text-[#8C7853] mx-auto stroke-1" />
                <h3 className="font-serif text-2xl text-[#121212] font-medium">
                  Trouble connecting to our servers. Please try our WhatsApp.
                </h3>
                <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">
                  Our concierge team is directly available on WhatsApp to assist with current atelier stock, bespoke sizing, and immediate order confirmations.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="https://wa.me/919380509397?text=Hello%20LaClass%C3%A9%20Abaya%20Concierge!%20I%20would%20like%20to%20inquire%20about%20your%20luxury%20collections."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-medium uppercase tracking-[0.2em] px-6 py-2.5 rounded-xs transition-colors shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>WhatsApp Concierge</span>
                  </a>
                  <button
                    onClick={refreshStoreData}
                    className="inline-flex items-center gap-2 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] text-xs font-medium uppercase tracking-[0.2em] px-6 py-2.5 rounded-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            ) : products.length === 0 ? (
              /* Database Connected with Zero Products */
              <div className="text-center py-20 px-6 bg-[#FAF8F5] border border-[#F0ECE1] rounded-xs space-y-4">
                <AlertCircle className="w-12 h-12 text-[#8C7853] mx-auto stroke-1" />
                <h3 className="font-serif text-2xl text-[#121212] font-medium">
                  No products available right now.
                </h3>
                <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">
                  Our haute couture collections are currently being prepared for the upcoming season. Please check back soon or contact our concierge for bespoke commissions.
                </p>
                <div className="pt-2">
                  <button
                    onClick={refreshStoreData}
                    className="inline-flex items-center gap-2 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] text-xs font-medium uppercase tracking-[0.2em] px-6 py-2.5 rounded-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Again</span>
                  </button>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Filtered empty state */
              <div className="text-center py-20 bg-[#FAF8F5] border border-[#F0ECE1] rounded-xs space-y-4">
                <Search className="w-12 h-12 text-[#8C7853] mx-auto stroke-1" />
                <h3 className="font-serif text-2xl text-[#121212]">No Abayas Found</h3>
                <p className="text-xs text-[#666666] max-w-sm mx-auto">
                  We couldn't find any designs matching your selected filters. Try broadening your price range or clearing fabric selections.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-[#121212] text-[#FCFCFA] text-xs font-medium uppercase tracking-[0.2em] px-6 py-2.5 rounded-xs hover:bg-[#8C7853] transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Active Product Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={onSelectProduct}
                  />
                ))}
              </div>
            )}
          </main>

        </div>

      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-[#121212]/60 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-4/5 max-w-xs bg-[#FCFCFA] h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <h3 className="font-serif text-xl font-medium text-[#121212]">Filter Abayas</h3>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-[#121212]">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#121212] mb-3">Categories</h4>
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xs ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#121212] text-[#FCFCFA] font-semibold'
                        : 'text-[#555555]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#121212] mb-3">Fabric</h4>
              <div className="space-y-1.5">
                {FABRICS.map((fab) => (
                  <button
                    key={fab}
                    onClick={() => {
                      setSelectedFabric(fab);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xs ${
                      selectedFabric === fab ? 'bg-[#121212] text-[#FCFCFA]' : 'text-[#555555]'
                    }`}
                  >
                    {fab}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                resetFilters();
                setIsMobileFilterOpen(false);
              }}
              className="w-full bg-[#121212] text-[#FCFCFA] py-3 text-xs uppercase tracking-widest rounded-xs"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
