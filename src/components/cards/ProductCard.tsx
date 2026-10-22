import React, { useState, useEffect } from 'react';
import { Eye, Heart, ShoppingBag, Sparkles, Star } from 'lucide-react';
import { Product } from '../../types';
import { Product as DatabaseProduct } from '../../types/database';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';

interface ProductCardProps {
  product: Product | DatabaseProduct | any;
  onSelectProduct: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const fallbackImg = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop';

  const formatImageUrl = (url?: string | null): string => {
    if (!url) return fallbackImg;
    const trimmed = url.trim();
    if (trimmed.startsWith('/assets/products/')) return trimmed;
    if (trimmed.includes('/storage/v1/object/public/abaya-store-assets/')) {
      const filename = trimmed.split('/storage/v1/object/public/abaya-store-assets/')[1];
      return `/assets/products/${filename}`;
    }
    return trimmed;
  };

  // Map image1 as default, image2 and image3 for hover slideshow/fade
  const rawImage1 = (product as any).image_1 || product.image1 || (product as any).thumbnail || fallbackImg;
  const rawImage2 = (product as any).image_2 || product.image2 || (product.images && product.images[1]) || rawImage1;
  const rawImage3 = (product as any).image_3 || product.image3 || (product.images && product.images[2]) || rawImage2;

  const image1 = formatImageUrl(rawImage1);
  const image2 = formatImageUrl(rawImage2);
  const image3 = formatImageUrl(rawImage3);

  // Bind size variants from selected_variants array
  const variants: string[] = (product as any).selected_variants && (product as any).selected_variants.length > 0
    ? (product as any).selected_variants
    : (product.sizes && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL']);

  const lengths = product.lengths && product.lengths.length > 0 ? product.lengths : ['52"', '54"', '56"', '58"', '60"'];

  const [isHovered, setIsHovered] = useState(false);
  const [hoverSlideIndex, setHoverSlideIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(variants[0] || 'M');
  const [selectedLength] = useState<string>(lengths[1] || lengths[0] || '54"');

  // Slideshow/fade animation between image_2 and image_3 on hover
  useEffect(() => {
    if (!isHovered) {
      setHoverSlideIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setHoverSlideIndex((prev) => (prev === 0 ? 1 : 0));
    }, 1400);
    return () => clearInterval(timer);
  }, [isHovered]);

  const activeImage = !isHovered
    ? image1
    : (hoverSlideIndex === 0 ? image2 : image3);

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist, setQuickViewProduct } = useStore();

  const isWishlisted = wishlist.includes(product.id);
  const effectivePrice = product.offerPrice ?? product.price ?? 0;
  const hasDiscount = Boolean(product.offerPrice && product.offerPrice < product.price);
  const rating = product.rating ?? 5;
  const reviewCount = product.reviewCount ?? 0;

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
          src={activeImage}
          alt={product.name || 'Abaya'}
          className="w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
          loading="lazy"
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

          {/* Size Variant Selector from selected_variants */}
          {variants.length > 0 && (
            <div className="flex items-center gap-1 pt-1.5" onClick={(e) => e.stopPropagation()}>
              {variants.slice(0, 5).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-medium rounded-xs border transition-colors ${
                    selectedSize === sz
                      ? 'bg-[#121212] text-[#FCFCFA] border-[#121212]'
                      : 'bg-[#FCFCFA] text-[#777777] border-[#E8E4DA] hover:border-[#8C7853]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}
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
            className="p-2 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] rounded-xs transition-colors flex items-center justify-center gap-1 text-[11px] font-medium tracking-widest uppercase px-3"
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
