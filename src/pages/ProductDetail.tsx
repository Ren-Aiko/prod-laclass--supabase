import React, { useState, useEffect } from 'react';
import { Star, ShoppingBag, Heart, ShieldCheck, Truck, Sparkles, MessageCircle, Ruler, Check, ArrowLeft, Send, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, CustomMeasurements } from '../types';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/cards/ProductCard';
import { CustomMeasurementsForm, INITIAL_CUSTOM_MEASUREMENTS, MEASUREMENT_FIELDS } from '../components/ui/CustomMeasurementsForm';

interface ProductDetailPageProps {
  product?: Product | null;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onSelectProduct
}) => {
  const { addToCart } = useCart();
  const { products, wishlist, toggleWishlist, setIsSizeGuideOpen, reviews, addCustomerReview } = useStore();

  const p = product || products[0];

  // Images: prioritize image1, image2, image3
  const images = p 
    ? [p.image1, p.image2, p.image3, ...(p.images || [])].filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx)
    : [];
  if (images.length === 0 && p?.thumbnail) images.push(p.thumbnail);
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop');

  // Compute available sizes strictly from active inventory variants
  // Never add XS or S. Only show options corresponding to real active variants.
  const rawSizes = Array.isArray(p?.sizes)
    ? p.sizes.map(s => (typeof s === 'object' && s !== null ? s.size : String(s)))
    : [];
  
  const availableSizes = rawSizes.filter(s => s && !['XS', 'S'].includes(s.toUpperCase()));
  if (!availableSizes.includes('Custom')) {
    availableSizes.push('Custom');
  }

  // Available lengths
  const availableLengths = p?.lengths && p.lengths.length > 0 ? p.lengths : ['56"'];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(() => availableSizes[0] || 'L');
  const [selectedLength, setSelectedLength] = useState<string>(() => availableLengths[0] || '56"');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [showSizeGuideInline, setShowSizeGuideInline] = useState(false);

  // Custom Measurements State & Validation
  const [customMeasurements, setCustomMeasurements] = useState<CustomMeasurements>(INITIAL_CUSTOM_MEASUREMENTS);
  const [measurementErrors, setMeasurementErrors] = useState<Partial<Record<keyof CustomMeasurements, boolean>>>({});
  const [customValidationMsg, setCustomValidationMsg] = useState<string | null>(null);

  // Review form state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Re-sync options when product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedImageIndex(0);

    const sizes = Array.isArray(p?.sizes)
      ? p.sizes.map(s => (typeof s === 'object' && s !== null ? s.size : String(s))).filter(s => s && !['XS', 'S'].includes(s.toUpperCase()))
      : [];
    if (!sizes.includes('Custom')) sizes.push('Custom');
    
    // Default size: first standard variant size
    const firstStd = sizes.find(s => s !== 'Custom') || 'Custom';
    setSelectedSize(firstStd);

    // Default length: first length
    const lens = p?.lengths && p.lengths.length > 0 ? p.lengths : ['56"'];
    setSelectedLength(lens[0] || '56"');
    setQuantity(1);
    setMeasurementErrors({});
    setCustomValidationMsg(null);
  }, [p?.id, p?.product_id]);

  if (!p) {
    return (
      <div className="bg-[#FCFCFA] min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-serif text-2xl text-[#121212] mb-2">Not able to show products at this time.</h2>
        <p className="text-xs text-[#777777] mb-6">The requested product could not be found or the catalog is empty.</p>
        <button
          onClick={onBack}
          className="bg-[#121212] text-[#FCFCFA] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Determine if this garment belongs to 4 COLLECTION (LC001-LC004) or New Guide (LC005-LC009)
  const isLC001to004 = ['LC001', 'LC002', 'LC003', 'LC004'].includes(p.product_id || p.productId || '');

  // Calculate stock for selected size & length
  const getSelectedVariantStock = (): number => {
    if (selectedSize === 'Custom') return 9999;
    
    // Check variantStock key: `${size}_${length}`
    if (p.variantStock) {
      const key = `${selectedSize}_${selectedLength}`;
      if (p.variantStock[key] !== undefined) return p.variantStock[key];
    }

    // Check sizeStock
    if (p.sizeStock && p.sizeStock[selectedSize] !== undefined) {
      return p.sizeStock[selectedSize];
    }

    return p.quantity ?? 1;
  };

  const currentStock = getSelectedVariantStock();
  const isOutOfStock = selectedSize !== 'Custom' && currentStock <= 0;

  const handleMeasurementChange = (field: keyof CustomMeasurements, value: string) => {
    setCustomMeasurements(prev => ({ ...prev, [field]: value }));
    if (measurementErrors[field]) {
      setMeasurementErrors(prev => ({ ...prev, [field]: false }));
    }
    if (customValidationMsg) {
      setCustomValidationMsg(null);
    }
  };

  const effectivePrice = p.offerPrice ?? p.price;
  const isWishlisted = wishlist.includes(p.id);

  const productReviews = reviews.filter(r => r.productId === p.id && r.approved === true);
  const relatedProducts = products
    .filter(item => item.id !== p.id && item.product_id !== p.product_id)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (selectedSize === 'Custom') {
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
      p,
      selectedSize,
      selectedSize === 'Custom' ? '' : selectedLength,
      quantity,
      selectedSize === 'Custom' ? customMeasurements : undefined
    );
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewText.trim()) return;
    await addCustomerReview(p.id, p.name, reviewerName, reviewRating, reviewText);
    setReviewSubmitted(true);
    setReviewerName('');
    setReviewText('');
    setTimeout(() => setReviewSubmitted(false), 5000);
  };

  const customSummary = selectedSize === 'Custom'
    ? `Custom Measurements: Chest ${customMeasurements.chest}", Hip ${customMeasurements.hip}", Length ${customMeasurements.abayaLength}", Height ${customMeasurements.height}cm, Sleeve ${customMeasurements.sleeveLength}"`
    : `Size: ${selectedSize}, Length: ${selectedLength}`;

  const whatsappText = encodeURIComponent(
    `Hello LaClassé! I am interested in ordering the *${p.name}* (${customSummary}).`
  );

  return (
    <div className="bg-[#FCFCFA] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Button & Breadcrumbs */}
        <div className="mb-8 flex items-center justify-between text-xs text-[#777777]">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#121212] hover:text-[#8C7853] font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono">
            <span>Catalog</span>
            <span>/</span>
            <span>{p.category}</span>
            <span>/</span>
            <span className="text-[#121212] font-semibold">{p.name}</span>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-[#FAF8F5] border border-[#F0ECE1] p-6 sm:p-10 rounded-xs mb-16 shadow-sm">
          
          {/* Left Gallery (7 cols) */}
          <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-4">
            {/* Main Image Container */}
            <div className="flex-1 aspect-[3/4] bg-[#F5F2EA] rounded-xs overflow-hidden relative shadow-md">
              <img
                src={images[selectedImageIndex] || p.thumbnail}
                alt={p.name}
                className="w-full h-full object-cover object-center transition-all duration-500"
              />

              {p.featured && (
                <div className="absolute top-4 left-4 bg-[#121212] text-[#FCFCFA] text-[9px] font-semibold uppercase tracking-[0.2em] px-3 py-1.5 rounded-xs">
                  Atelier Signature
                </div>
              )}
            </div>

            {/* Thumbnails (Supports up to 3 R2 images) */}
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-24 shrink-0">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 md:w-full aspect-[3/4] rounded-xs overflow-hidden border-2 transition-all relative shrink-0 cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#8C7853] shadow-md opacity-100 scale-102'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded-xs">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Product Options (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Category & Collection */}
              <div className="flex items-center justify-between text-xs text-[#8C7853] uppercase tracking-[0.25em] font-medium mb-2">
                <span>{p.collection || `${p.category} Collection`}</span>
                <span className="bg-[#8C7853]/10 px-2 py-0.5 rounded-xs">{p.fabric}</span>
              </div>

              {/* Product Title */}
              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#121212] tracking-wide mb-3">
                {p.name}
              </h1>

              {/* Price & Rating */}
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4 mb-4">
                <div className="flex items-baseline space-x-3">
                  <span className="text-2xl font-semibold text-[#121212]">
                    ₹{effectivePrice.toLocaleString('en-IN')}
                  </span>
                  {(p.originalPrice || p.offerPrice) && (
                    <span className="text-sm text-[#888888] line-through">
                      ₹{(p.originalPrice || p.price).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <div className="flex text-[#D4AF37]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[#666666] font-medium">({p.reviewCount || 0} reviews)</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#555555] leading-relaxed mb-5">
                {p.description}
              </p>

              {/* Detailed Fabric Box */}
              <div className="bg-[#FCFCFA] p-3.5 border border-[#EAEAEA] rounded-xs text-[11px] text-[#666666] leading-relaxed mb-6">
                <strong className="text-[#121212] font-semibold block mb-0.5 uppercase tracking-wider">Fabric & Weave:</strong>
                {p.detailedFabric}
              </div>

              {/* SIZE SELECTION & STOCK HANDLING */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
                  <span className="text-[#121212]">
                    Size: <strong className="text-[#8C7853]">{selectedSize}</strong>
                  </span>

                  {/* Stock Availability Indicator */}
                  {selectedSize === 'Custom' ? (
                    <span className="text-[11px] text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-xs font-medium">
                      Bespoke Tailoring (Made-to-Order)
                    </span>
                  ) : isOutOfStock ? (
                    <span className="text-[11px] text-[#991b1b] bg-[#fee2e2] px-2 py-0.5 rounded-xs font-bold animate-pulse">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#8C7853] bg-[#8C7853]/10 px-2 py-0.5 rounded-xs font-medium">
                      In Stock: {currentStock} available
                    </span>
                  )}
                </div>

                {/* Size Pills: Strictly only active inventory sizes + Custom */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableSizes.map((sz) => {
                    const isCustom = sz === 'Custom';
                    const szStock = isCustom ? 9999 : (p.sizeStock?.[sz] ?? 1);
                    const szOut = !isCustom && szStock <= 0;

                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xs border transition-all cursor-pointer relative ${
                          selectedSize === sz
                            ? 'bg-[#121212] text-[#FCFCFA] border-[#121212] shadow-sm'
                            : szOut
                            ? 'border-[#EAEAEA] bg-[#F5F2EA] text-[#AAAAAA] line-through'
                            : 'border-[#D1CDC7] bg-[#FCFCFA] text-[#121212] hover:border-[#121212]'
                        }`}
                      >
                        {sz}
                        {szOut && (
                          <span className="absolute -top-1.5 -right-1.5 bg-[#991b1b] text-[8px] text-white px-1 rounded-full font-mono font-normal no-underline">
                            0
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contextual Size Chart Toggle:
                    Display 4 COLLECTION size chart for LC001-LC004
                    Display New Size Guide for LC005-LC009 */}
                {selectedSize !== 'Custom' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowSizeGuideInline(!showSizeGuideInline)}
                      className="text-[11px] text-[#8C7853] hover:text-[#121212] underline underline-offset-2 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>
                        {showSizeGuideInline 
                          ? 'Hide Sizing Chart' 
                          : isLC001to004 
                            ? '4 COLLECTION Size Chart (L, XL, XXL)' 
                            : 'New Size Guide (Free Size & Height Recommendations)'}
                      </span>
                      {showSizeGuideInline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showSizeGuideInline && (
                      <div className="mt-3 p-3.5 bg-[#FCFCFA] border border-[#E0DCD3] rounded-xs space-y-2 text-xs">
                        {isLC001to004 ? (
                          <>
                            <div className="flex items-center justify-between pb-1 border-b border-[#EAEAEA]">
                              <strong className="text-[11px] font-semibold uppercase tracking-wider text-[#121212]">
                                4 COLLECTION Size Chart
                              </strong>
                              <span className="text-[10px] text-[#8C7853]">Body Measurements in Inches / cm</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-[#121212] text-[#FCFCFA]">
                                    <th className="p-2 font-medium">Measurement</th>
                                    <th className="p-2 font-medium">L</th>
                                    <th className="p-2 font-medium">XL</th>
                                    <th className="p-2 font-medium">XXL</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EAEAEA] text-[#333333]">
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold">Chest (in)</td>
                                    <td className="p-2">42–44</td>
                                    <td className="p-2">45–47</td>
                                    <td className="p-2">48–50</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold">Hip (in)</td>
                                    <td className="p-2">44–46</td>
                                    <td className="p-2">48–50</td>
                                    <td className="p-2">52–54</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold">Abaya Length (in)</td>
                                    <td className="p-2">56</td>
                                    <td className="p-2">56</td>
                                    <td className="p-2">56</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold">Your Height (cm)</td>
                                    <td className="p-2">159</td>
                                    <td className="p-2">159</td>
                                    <td className="p-2">159</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold">Sleeve Length from Neck (in)</td>
                                    <td className="p-2">28</td>
                                    <td className="p-2">28</td>
                                    <td className="p-2">28</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between pb-1 border-b border-[#EAEAEA]">
                              <strong className="text-[11px] font-semibold uppercase tracking-wider text-[#121212]">
                                New Size Guide (Free Size)
                              </strong>
                              <span className="text-[10px] text-[#8C7853]">Recommended Lengths by Height</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-[#121212] text-[#FCFCFA]">
                                    <th className="p-2 font-medium">Garment Size</th>
                                    <th className="p-2 font-medium">Abaya Length</th>
                                    <th className="p-2 font-medium">Customer Height</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EAEAEA] text-[#333333]">
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold" rowSpan={5}>Free Size</td>
                                    <td className="p-2 font-semibold text-[#8C7853]">52 Inches</td>
                                    <td className="p-2">5'0" – 5'2" (152 – 157 cm)</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold text-[#8C7853]">54 Inches</td>
                                    <td className="p-2">5'3" – 5'4" (158 – 162 cm)</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold text-[#8C7853]">56 Inches</td>
                                    <td className="p-2">5'5" – 5'6" (163 – 167 cm)</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold text-[#8C7853]">58 Inches</td>
                                    <td className="p-2">5'7" – 5'8" (168 – 172 cm)</td>
                                  </tr>
                                  <tr className="hover:bg-[#FAF8F5]">
                                    <td className="p-2 font-semibold text-[#8C7853]">60 Inches</td>
                                    <td className="p-2">5'9"+ (173 cm & above)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* BESPOKE CUSTOM MEASUREMENTS FORM (Shown ONLY when 'Custom' is selected) */}
                {selectedSize === 'Custom' && (
                  <CustomMeasurementsForm
                    measurements={customMeasurements}
                    onChange={handleMeasurementChange}
                    errors={measurementErrors}
                    validationMessage={customValidationMsg}
                  />
                )}
              </div>

              {/* LENGTH SELECTOR:
                  Section C requirement: Hide length selector completely when customer chooses Custom! */}
              {selectedSize !== 'Custom' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2 text-[#121212]">
                    <span>
                      Length: <strong className="text-[#8C7853]">{selectedLength}</strong>
                    </span>
                    {p.variantStock?.[`${selectedSize}_${selectedLength}`] !== undefined && (
                      <span className="text-[10px] text-[#777777] font-normal lowercase">
                        ({p.variantStock[`${selectedSize}_${selectedLength}`]} in stock for this length)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableLengths.map((len) => {
                      const lenStock = p.variantStock?.[`${selectedSize}_${len}`] ?? 1;
                      const lenOut = lenStock <= 0;

                      return (
                        <button
                          key={len}
                          onClick={() => setSelectedLength(len)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs border transition-all cursor-pointer relative ${
                            selectedLength === len
                              ? 'bg-[#121212] text-[#FCFCFA] border-[#121212]'
                              : lenOut
                              ? 'border-[#EAEAEA] bg-[#F5F2EA] text-[#AAAAAA] line-through'
                              : 'border-[#D1CDC7] bg-[#FCFCFA] text-[#121212] hover:border-[#121212]'
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
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#121212]">Quantity:</span>
                <div className="flex items-center border border-[#D1CDC7] rounded-xs bg-[#FCFCFA]">
                  <button
                    disabled={isOutOfStock}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 text-sm font-semibold hover:bg-[#EAEAEA] disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3.5 py-1 text-xs font-semibold text-[#121212]">{quantity}</span>
                  <button
                    disabled={isOutOfStock || (selectedSize !== 'Custom' && quantity >= currentStock)}
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 text-sm font-semibold hover:bg-[#EAEAEA] disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-[#EAEAEA]">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isOutOfStock
                      ? 'bg-[#E5E0D8] text-[#888888] cursor-not-allowed shadow-none'
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
                  onClick={() => toggleWishlist(p.id)}
                  className={`p-4 border rounded-xs transition-colors cursor-pointer ${
                    isWishlisted
                      ? 'border-[#121212] bg-[#121212] text-[#D4AF37]'
                      : 'border-[#D1CDC7] text-[#121212] hover:border-[#121212]'
                  }`}
                  title="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* WhatsApp Concierge Order Button */}
              <a
                href={`https://wa.me/919380509397?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#FCFCFA] border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white py-3 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order via WhatsApp Atelier Concierge</span>
              </a>
            </div>

          </div>

        </div>

        {/* Customer Reviews Section */}
        <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-6 sm:p-10 rounded-xs mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[#EAEAEA] mb-8 gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#121212]">
                Customer Reviews & Atelier Experiences
              </h2>
              <p className="text-xs text-[#777777] mt-1">Verified patrons of LaClassé Haute Couture</p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="flex text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span>{p.rating || '5.0'} / 5.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Reviews List */}
            <div className="lg:col-span-7 space-y-4">
              {productReviews.length === 0 ? (
                <div className="p-8 text-center bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs text-xs text-[#777777]">
                  No published reviews for this bespoke design yet. Be the first to share your thoughts below.
                </div>
              ) : (
                productReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#121212]">{rev.customerName}</span>
                      <span className="text-[10px] text-[#888888]">{rev.date}</span>
                    </div>
                    <div className="flex text-[#D4AF37]">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs text-[#555555] leading-relaxed">{rev.reviewText}</p>
                  </div>
                ))
              )}
            </div>

            {/* Submit Review Form */}
            <div className="lg:col-span-5 bg-[#FCFCFA] border border-[#EAEAEA] p-6 rounded-xs space-y-4">
              <h3 className="font-serif text-lg font-medium text-[#121212]">Write a Review</h3>
              
              {reviewSubmitted && (
                <div className="p-3 bg-[#dcfce7] text-[#166534] text-xs rounded-xs">
                  Thank you! Your review has been submitted and will appear upon moderation.
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#555555] mb-1 font-medium">Your Name</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Fatima Z."
                    className="w-full px-3 py-2 border border-[#D1CDC7] rounded-xs focus:outline-none focus:border-[#121212]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#555555] mb-1 font-medium">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`text-lg cursor-pointer ${star <= reviewRating ? 'text-[#D4AF37]' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#555555] mb-1 font-medium">Review</label>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with the fabric, cut, and fit..."
                    className="w-full px-3 py-2 border border-[#D1CDC7] rounded-xs focus:outline-none focus:border-[#121212]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#121212] hover:bg-[#8C7853] text-white py-2.5 rounded-xs font-semibold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                >
                  Submit Review
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="font-serif text-2xl font-medium text-[#121212] mb-6">
              You May Also Admire
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
