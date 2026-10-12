import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, ShieldCheck, Truck, AlertCircle, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { NEUTRAL_PRODUCT_PLACEHOLDER } from '../cards/ProductCard';

interface CartDrawerProps {
  onProceedToCheckout?: () => void;
  onOpenCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout, onOpenCheckout }) => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    appliedCoupon,
    couponError,
    applyCouponCode,
    removeCoupon,
    subtotal,
    discountAmount,
    shippingFee,
    grandTotal,
    totalItemCount
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!isCartOpen) return null;

  const freeShippingThreshold = 5000;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCouponCode(couponInput);
    setIsApplyingCoupon(false);
    setCouponInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#121212]/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FCFCFA] text-[#121212] shadow-2xl flex flex-col justify-between relative border-l border-[#EAEAEA]">
          
          {/* Header */}
          <div className="p-6 border-b border-[#F0ECE1] flex items-center justify-between bg-[#FAF8F5]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#8C7853]" />
              <h2 className="font-serif text-xl tracking-wide font-medium">
                Shopping Bag ({totalItemCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 text-[#121212] hover:text-[#8C7853] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="bg-[#121212] text-[#FCFCFA] px-6 py-3 text-xs">
            {amountNeededForFreeShipping > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-[#D1CDC7]">
                  <span>Add <strong>₹{amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> for Free Shipping</span>
                  <span>{Math.round(freeShippingProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#333333] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] transition-all duration-500"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#D4AF37] font-semibold text-[11px]">
                <Truck className="w-4 h-4" />
                <span>You’ve Unlocked Free Express Shipping Across India!</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <ShoppingBag className="w-12 h-12 text-[#D1CDC7] mx-auto stroke-1" />
                <p className="font-serif text-lg text-[#555555]">Your shopping bag is empty.</p>
                <p className="text-xs text-[#888888] max-w-xs mx-auto">
                  Explore our luxury Dubai & Indonesian silk abaya collections.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-[#121212] text-[#FCFCFA] text-xs font-medium uppercase tracking-[0.2em] px-6 py-2.5 rounded-xs hover:bg-[#8C7853] transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const itemPrice = item.product.offerPrice ?? item.product.price;
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-[#FAF8F5] border border-[#F0ECE1] rounded-xs relative group"
                  >
                    <img
                      src={item.product.thumbnail || item.product.image1 || item.product.images?.[0] || NEUTRAL_PRODUCT_PLACEHOLDER}
                      alt={item.product.name || 'Cart Item'}
                      className="w-20 h-24 object-cover rounded-xs bg-[#F5F2EA]"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-serif text-sm font-medium text-[#121212] line-clamp-1 pr-4">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#999999] hover:text-[#990000] p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8C7853] font-medium tracking-wider uppercase mt-0.5">
                          <span>Size: {item.selectedSize}</span>
                          {item.selectedSize !== 'Custom' && item.selectedLength && (
                            <>
                              <span>•</span>
                              <span>Length: {item.selectedLength}</span>
                            </>
                          )}
                        </div>

                        {item.customMeasurements && (
                          <div className="mt-1.5 p-2 bg-[#F5F2EA] border border-[#E0DCD3] rounded-xs text-[10px] text-[#555555] space-y-0.5">
                            <span className="font-semibold text-[#121212] block uppercase tracking-wider text-[9px]">Bespoke Custom Measurements:</span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-[#333333]">
                              <span>Chest: {item.customMeasurements.chest}"</span>
                              <span>Hip: {item.customMeasurements.hip}"</span>
                              <span>Abaya Length: {item.customMeasurements.abayaLength}"</span>
                              <span>Height: {item.customMeasurements.height} cm</span>
                              <span className="col-span-2">Sleeve: {item.customMeasurements.sleeveLength}"</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-[#D1CDC7] rounded-xs bg-[#FCFCFA]">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2 py-0.5 text-xs font-semibold hover:bg-[#EAEAEA]"
                          >
                            -
                          </button>
                          <span className="px-2.5 text-xs font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-0.5 text-xs font-semibold hover:bg-[#EAEAEA]"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-xs font-semibold text-[#121212]">
                          ₹{(itemPrice * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Order Summary */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-[#F0ECE1] bg-[#FAF8F5] space-y-4">
              
              {/* Coupon Form */}
              <div className="space-y-1">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-[#8C7853]/15 border border-[#8C7853] px-3 py-2 rounded-xs text-xs">
                    <div className="flex items-center gap-1.5 text-[#121212]">
                      <Tag className="w-3.5 h-3.5 text-[#8C7853]" />
                      <span className="font-semibold">{appliedCoupon.code}</span>
                      <span className="text-[#666666]">
                        (-₹{discountAmount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-[10px] uppercase tracking-wider text-[#990000] font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon Code (e.g. LACLASSE10)"
                      className="flex-1 bg-[#FCFCFA] border border-[#D1CDC7] px-3 py-1.5 text-xs rounded-xs text-[#121212] focus:outline-none focus:border-[#121212] uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon}
                      className="bg-[#121212] text-[#FCFCFA] text-xs font-medium uppercase tracking-wider px-4 py-1.5 rounded-xs hover:bg-[#8C7853] transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <div className="text-[10px] text-[#990000] flex items-center gap-1 pt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-[#555555] pt-1 border-t border-[#EAEAEA]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-[#121212] font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#2e7d32]">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="text-[#121212] font-medium">
                    {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#121212] pt-2 border-t border-[#D1CDC7]">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  if (typeof onProceedToCheckout === 'function') {
                    onProceedToCheckout();
                  } else if (typeof onOpenCheckout === 'function') {
                    onOpenCheckout();
                  }
                }}
                className="w-full bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] py-3 text-xs font-medium uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-[10px] text-center text-[#777777]">
                Taxes included • Free Returns Within 7 Days
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
