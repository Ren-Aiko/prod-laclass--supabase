import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, Check, Heart, Ruler, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useCart } from '../../context/CartContext';
import { Product, CustomMeasurements } from '../../types';
import { CustomMeasurementsForm, INITIAL_CUSTOM_MEASUREMENTS, MEASUREMENT_FIELDS } from './CustomMeasurementsForm';

interface QuickViewModalProps {
  onSelectProduct?: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ onSelectProduct }) => {
  const { quickViewProduct, setQuickViewProduct, wishlist, toggleWishlist } = useStore();
  const { addToCart } = useCart();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('L');
  const [selectedLength, setSelectedLength] = useState<string>('56"');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [showSizeGuideInline, setShowSizeGuideInline] = useState(false);

  // Custom Measurements State & Validation
  const [customMeasurements, setCustomMeasurements] = useState<CustomMeasurements>(INITIAL_CUSTOM_MEASUREMENTS);
  const [measurementErrors, setMeasurementErrors] = useState<Partial<Record<keyof CustomMeasurements, boolean>>>({});
  const [customValidationMsg, setCustomValidationMsg] = useState<string | null>(null);

  // Available sizes strictly from active inventory variants (no XS or S)
  const rawSizes = Array.isArray(quickViewProduct?.sizes)
    ? quickViewProduct.sizes.map(s => (typeof s === 'object' && s !== null ? s.size : String(s)))
    : [];
  const availableSizes = rawSizes.filter(s => s && !['XS', 'S'].includes(s.toUpperCase()));
  if (!availableSizes.includes('Custom')) {
    availableSizes.push('Custom');
  }

  const availableLengths = quickViewProduct?.lengths && quickViewProduct.lengths.length > 0 
    ? quickViewProduct.lengths 
    : ['56"'];

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedImageIndex(0);
      const firstStd = availableSizes.find(s => s !== 'Custom') || 'Custom';
      setSelectedSize(firstStd);
      setSelectedLength(availableLengths[0] || '56"');
      setQuantity(1);
      setMeasurementErrors({});
      setCustomValidationMsg(null);
    }
  }, [quickViewProduct?.id, quickViewProduct?.product_id]);

  if (!quickViewProduct) return null;

  const isLC001to004 = ['LC001', 'LC002', 'LC003', 'LC004'].includes(quickViewProduct.product_id || quickViewProduct.productId || '');

  const images = [quickViewProduct.image1, quickViewProduct.image2, quickViewProduct.image3, ...(quickViewProduct.images || [])]
    .filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx);
  if (images.length === 0 && quickViewProduct.thumbnail) images.push(quickViewProduct.thumbnail);
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop');

  const activeSize = selectedSize || availableSizes[0] || 'L';
  const activeLength = selectedLength || availableLengths[0] || '56"';

  // Stock check for selected variant
  const getSelectedVariantStock = (): number => {
    if (activeSize === 'Custom') return 9999;
    
    if (quickViewProduct.variantStock) {
      const key = `${activeSize}_${activeLength}`;
      if (quickViewProduct.variantStock[key] !== undefined) return quickViewProduct.variantStock[key];
    }

    if (quickViewProduct.sizeStock && quickViewProduct.sizeStock[activeSize] !== undefined) {
      return quickViewProduct.sizeStock[activeSize];
    }

    return quickViewProduct.quantity ?? 1;
  };

  const currentStock = getSelectedVariantStock();
  const isOutOfStock = activeSize !== 'Custom' && currentStock <= 0;

  const handleMeasurementChange = (field: keyof CustomMeasurements, value: string) => {
    setCustomMeasurements(prev => ({ ...prev, [field]: value }));
    if (measurementErrors[field]) {
      setMeasurementErrors(prev => ({ ...prev, [field]: false }));
    }
    if (customValidationMsg) {
      setCustomValidationMsg(null);
    }
  };

  const effectivePrice = quickViewProduct.offerPrice ?? quickViewProduct.price ?? 0;
  const isWishlisted = wishlist.includes(quickViewProduct.id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (activeSize === 'Custom') {
      const errors: Partial<Record<keyof CustomMeasurements, boolean>> = {};
      let hasError = false;

      MEASUREMENT_FIELDS.forEach(({ key }) => {
        const val = customMeasurements[key];
        if (!val || String(val).trim() === '' || isNaN(Number(val)) || Number(val) <= 0) {
          errors[key] = true;
          hasError = true;
        }
      });

      if (hasError) {
        setMeasurementErrors(errors);
        setCustomValidationMsg('Please enter valid positive numeric values for all 5 bespoke measurement fields.');
        return;
      }
    }

    setMeasurementErrors({});
    setCustomValidationMsg(null);
    addToCart(
      quickViewProduct,
      activeSize,
      activeSize === 'Custom' ? '' : activeLength,
      quantity,
      activeSize === 'Custom' ? customMeasurements : undefined
    );
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setQuickViewProduct(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/75 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[92vh] flex flex-col md:flex-row my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 p-2 text-[#121212] hover:text-[#8C7853] bg-white/80 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Product Images Gallery */}
        <div className="w-full md:w-1/2 bg-[#F5F2EA] p-6 flex flex-col justify-between">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xs mb-4 shadow-sm">
            <img
              src={images[selectedImageIndex] || quickViewProduct.thumbnail}
              alt={quickViewProduct.name}
              className="w-full h-full object-cover object-center transition-all duration-300"
            />
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-16 h-20 rounded-xs overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  selectedImageIndex === idx ? 'border-[#8C7853] scale-102' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Details & Options */}
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto flex flex-col justify-between space-y-5">
          <div>
            {/* Collection & Fabric */}
            <div className="flex items-center justify-between text-xs text-[#8C7853] uppercase tracking-[0.2em] font-medium mb-1">
              <span>{quickViewProduct.collection}</span>
              <span>{quickViewProduct.fabric}</span>
            </div>

            {/* Title */}
            <h2 className="font-serif text-2xl md:text-3xl font-medium text-[#121212] mb-2">
              {quickViewProduct.name}
            </h2>

            {/* Price & Rating */}
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3 mb-4">
              <div className="flex items-baseline space-x-3">
                <span className="text-xl font-semibold text-[#121212]">
                  ₹{effectivePrice.toLocaleString('en-IN')}
                </span>
                {(quickViewProduct.originalPrice || quickViewProduct.offerPrice) && (
                  <span className="text-sm text-[#888888] line-through">
                    ₹{(quickViewProduct.originalPrice || quickViewProduct.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <div className="flex text-[#D4AF37]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[#666666] font-medium">({quickViewProduct.reviewCount || 0})</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-[#555555] leading-relaxed mb-4">
              {quickViewProduct.description}
            </p>

            {/* SIZE SELECTOR */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Size: <strong className="text-[#8C7853]">{activeSize}</strong></span>

                {activeSize === 'Custom' ? (
                  <span className="text-[10px] text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-xs font-medium">
                    Bespoke Tailoring
                  </span>
                ) : isOutOfStock ? (
                  <span className="text-[10px] text-[#991b1b] bg-[#fee2e2] px-2 py-0.5 rounded-xs font-bold">
                    Out of Stock
                  </span>
                ) : (
                  <span className="text-[10px] text-[#8C7853] bg-[#8C7853]/10 px-2 py-0.5 rounded-xs font-medium">
                    In Stock: {currentStock} available
                  </span>
                )}
              </div>

              {/* Only active sizes from variants + Custom */}
              <div className="flex flex-wrap gap-2 mb-2">
                {availableSizes.map((sz) => {
                  const isCustom = sz === 'Custom';
                  const szStock = isCustom ? 9999 : (quickViewProduct.sizeStock?.[sz] ?? 1);
                  const szOut = !isCustom && szStock <= 0;

                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-all cursor-pointer ${
                        activeSize === sz
                          ? 'bg-[#121212] text-[#FCFCFA] border-[#121212]'
                          : szOut
                          ? 'border-[#EAEAEA] bg-[#F5F2EA] text-[#AAAAAA] line-through'
                          : 'border-[#D1CDC7] text-[#121212] hover:border-[#121212]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              {/* Size Guide Toggle */}
              {activeSize !== 'Custom' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSizeGuideInline(!showSizeGuideInline)}
                    className="text-[11px] text-[#8C7853] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Ruler className="w-3 h-3" />
                    <span>
                      {showSizeGuideInline 
                        ? 'Hide Sizing Chart' 
                        : isLC001to004 
                          ? '4 COLLECTION Size Chart' 
                          : 'New Size Guide (Free Size)'}
                    </span>
                    {showSizeGuideInline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showSizeGuideInline && (
                    <div className="mt-2 p-2.5 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xs text-[10px] space-y-1">
                      {isLC001to004 ? (
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#E0DCD3] font-semibold text-[#121212]">
                              <th className="p-1">Measurement</th>
                              <th className="p-1">L</th>
                              <th className="p-1">XL</th>
                              <th className="p-1">XXL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAEAEA]">
                            <tr><td className="p-1 font-medium">Chest (in)</td><td className="p-1">42–44</td><td className="p-1">45–47</td><td className="p-1">48–50</td></tr>
                            <tr><td className="p-1 font-medium">Hip (in)</td><td className="p-1">44–46</td><td className="p-1">48–50</td><td className="p-1">52–54</td></tr>
                            <tr><td className="p-1 font-medium">Abaya Length (in)</td><td className="p-1">56</td><td className="p-1">56</td><td className="p-1">56</td></tr>
                            <tr><td className="p-1 font-medium">Your Height (cm)</td><td className="p-1">159</td><td className="p-1">159</td><td className="p-1">159</td></tr>
                            <tr><td className="p-1 font-medium">Sleeve Length from Neck (in)</td><td className="p-1">28</td><td className="p-1">28</td><td className="p-1">28</td></tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#E0DCD3] font-semibold text-[#121212]">
                              <th className="p-1">Garment Size</th>
                              <th className="p-1">Length</th>
                              <th className="p-1">Customer Height</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAEAEA]">
                            <tr><td className="p-1 font-medium" rowSpan={5}>Free Size</td><td className="p-1 font-semibold text-[#8C7853]">52"</td><td className="p-1">5'0" – 5'2" (152 – 157 cm)</td></tr>
                            <tr><td className="p-1 font-semibold text-[#8C7853]">54"</td><td className="p-1">5'3" – 5'4" (158 – 162 cm)</td></tr>
                            <tr><td className="p-1 font-semibold text-[#8C7853]">56"</td><td className="p-1">5'5" – 5'6" (163 – 167 cm)</td></tr>
                            <tr><td className="p-1 font-semibold text-[#8C7853]">58"</td><td className="p-1">5'7" – 5'8" (168 – 172 cm)</td></tr>
                            <tr><td className="p-1 font-semibold text-[#8C7853]">60"</td><td className="p-1">5'9"+ (173 cm & above)</td></tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Measurements Form */}
              {activeSize === 'Custom' && (
                <CustomMeasurementsForm
                  measurements={customMeasurements}
                  onChange={handleMeasurementChange}
                  errors={measurementErrors}
                  validationMessage={customValidationMsg}
                />
              )}
            </div>

            {/* Length: Hide completely when Custom is selected! */}
            {activeSize !== 'Custom' && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#121212]">
                  Length: <strong className="text-[#8C7853]">{activeLength}</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableLengths.map((len) => {
                    const lenStock = quickViewProduct.variantStock?.[`${activeSize}_${len}`] ?? 1;
                    const lenOut = lenStock <= 0;

                    return (
                      <button
                        key={len}
                        onClick={() => setSelectedLength(len)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-all cursor-pointer ${
                          activeLength === len
                            ? 'bg-[#121212] text-[#FCFCFA] border-[#121212]'
                            : lenOut
                            ? 'border-[#EAEAEA] bg-[#F5F2EA] text-[#AAAAAA] line-through'
                            : 'border-[#D1CDC7] text-[#121212] hover:border-[#121212]'
                        }`}
                      >
                        {len}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121212]">Quantity:</span>
              <div className="flex items-center border border-[#D1CDC7] rounded-xs bg-[#FAF8F5]">
                <button
                  disabled={isOutOfStock}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2.5 py-1 text-sm font-semibold hover:bg-[#EAEAEA] disabled:opacity-40 cursor-pointer"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-[#121212]">{quantity}</span>
                <button
                  disabled={isOutOfStock || (activeSize !== 'Custom' && quantity >= currentStock)}
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2.5 py-1 text-sm font-semibold hover:bg-[#EAEAEA] disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#F0ECE1]">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isOutOfStock
                  ? 'bg-[#E5E0D8] text-[#888888] cursor-not-allowed'
                  : 'bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA]'
              }`}
            >
              {isOutOfStock ? (
                <>
                  <AlertCircle className="w-4 h-4 text-[#991b1b]" />
                  <span>Out of Stock</span>
                </>
              ) : addedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Added to Bag!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag — ₹{(effectivePrice * quantity).toLocaleString('en-IN')}</span>
                </>
              )}
            </button>

            <button
              onClick={() => toggleWishlist(quickViewProduct.id)}
              className={`p-3 border rounded-xs transition-colors cursor-pointer ${
                isWishlisted
                  ? 'border-[#121212] bg-[#121212] text-[#D4AF37]'
                  : 'border-[#D1CDC7] text-[#121212] hover:border-[#121212]'
              }`}
              title="Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
