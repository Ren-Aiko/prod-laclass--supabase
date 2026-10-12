import React, { useState } from 'react';
import { Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  priority?: boolean;
}

export const NEUTRAL_PRODUCT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect width='600' height='800' fill='%23F5F2EA'/%3E%3Cpath d='M300 240 L340 360 L380 620 L220 620 L260 360 Z' fill='none' stroke='%23D1CDC7' stroke-width='2' stroke-dasharray='4 4'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='500' letter-spacing='3' fill='%238C7853'%3ELACLASSE ATELIER%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='11' letter-spacing='1' fill='%23A09A92'%3EHAUTE COUTURE%3C/text%3E%3C/svg%3E";

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct, priority = false }) => {
  const sizes = product.sizes && product.sizes.length > 0
    ? product.sizes.map(s => (typeof s === 'object' ? s.size : s))
    : ['Free Size'];
  const lengths = product.lengths && product.lengths.length > 0 ? product.lengths : ['56"'];
  
  const primaryImage = product.image1 || product.thumbnail || (product.images && product.images[0]) || null;
  const secondaryImage = (product.images && product.images[1]) || product.image2 || null;

  const [isHovered, setIsHovered] = useState(false);
  const [selectedSize] = useState<string>(sizes[0] || 'Free Size');
  const [selectedLength] = useState<string>(lengths[0] || '56"');

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist, setQuickViewProduct } = useStore();

  const isWishlisted = wishlist.includes(product.id);
  const effectivePrice = product.offerPrice ?? product.price ?? 0;
  const hasDiscount = Boolean(product.offerPrice && product.offerPrice < product.price);
  const rating = product.rating ?? 5;
  const reviewCount = product.reviewCount ?? 0;

  // Swap to secondary image on hover ONLY if valid distinct secondary exists
  const activeImageSrc = (isHovered && secondaryImage && secondaryImage !== primaryImage)
    ? secondaryImage
    : (primaryImage || NEUTRAL_PRODUCT_PLACEHOLDER);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, selectedSize, selectedLength, 1);
  };

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group cursor-pointer bg-[#FCFCFA] border border-[#F0ECE1] hover:border-[#D1CDC7] transition-all duration-300 flex flex-col justify-between relative rounded-xs overflow-hidden"
    >
      {/* Product Image Container */}
      <div 
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#F5F2EA]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={activeImageSrc}
          alt={product.name || 'LaClassé Abaya'}
          width={600}
          height={800}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' } : {})}
          onError={(e) => {
            console.warn('[ProductCard Image Load Error]:', {
              productId: product.productId || product.id,
              name: product.name,
              attemptedSrc: e.currentTarget.src,
            });
            e.currentTarget.onerror = null;
            e.currentTarget.src = NEUTRAL_PRODUCT_PLACEHOLDER;
          }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.newArrival && (
            <span className="bg-[#121212] text-[#FCFCFA] text-[9px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-xs">
              New Season
            </span>
          )}
          {product.flashSale && (
            <span className="bg-[#8C7853] text-[#FCFCFA] text-[9px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-xs">
              Featured Sale
            </span>
          )}
          {product.category === 'Bridal' && (
            <span className="bg-[#D4AF37] text-[#121212] text-[9px] font-semibold tracking-[0.2em] uppercase px-2.5 py-1 rounded-xs">
              Bridal Couture
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
            isWishlisted
              ? 'bg-[#121212] text-[#D4AF37]'
              : 'bg-white/80 text-[#121212] hover:bg-[#121212] hover:text-[#FCFCFA]'
          }`}
          title="Add to Wishlist"
          aria-label="Wishlist product"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Overlay Button */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="flex-1 bg-[#FCFCFA]/95 hover:bg-[#121212] hover:text-[#FCFCFA] text-[#121212] text-xs uppercase tracking-[0.15em] font-medium py-2.5 px-3 rounded-xs shadow-lg backdrop-blur-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col justify-between flex-1 space-y-2">
        <div>
          {/* Collection & Fabric Pill */}
          <div className="flex items-center justify-between text-[10px] text-[#8C7853] uppercase tracking-[0.18em] font-medium mb-1">
            <span>{product.collection}</span>
            <span>{product.fabric}</span>
          </div>

          {/* Product Title */}
          <h3 className="font-serif text-base sm:text-lg text-[#121212] font-medium group-hover:text-[#8C7853] transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Ratings */}
          <div className="flex items-center gap-1 mt-1">
            <div className="flex text-[#D4AF37]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(rating) ? 'fill-current' : 'text-[#E0DCD3]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-[#777777] font-medium">
              ({reviewCount})
            </span>
          </div>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2 border-t border-[#F5F2EA] flex items-center justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm sm:text-base font-semibold text-[#121212]">
              ₹{effectivePrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#888888] line-through">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            className="p-2 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] rounded-xs transition-colors flex items-center justify-center gap-1 text-[11px] font-medium tracking-widest uppercase px-3 cursor-pointer"
            title="Add to bag"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
