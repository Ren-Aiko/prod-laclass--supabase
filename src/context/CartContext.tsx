import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Coupon, CustomMeasurements } from '../types';
import { verifyCouponCode, fetchCoupons } from '../services/api';
import { validateCoupon } from '../services/coupon';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    selectedSize: string,
    selectedLength: string,
    quantity?: number,
    customMeasurements?: CustomMeasurements
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  couponError: string | null;
  applyCouponCode: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  totalItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('laclasse_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is CartItem =>
              Boolean(
                item &&
                typeof item === 'object' &&
                item.product &&
                typeof item.product === 'object' &&
                item.product.id &&
                typeof item.quantity === 'number'
              )
          );
        }
      }
    } catch {}
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('laclasse_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (
    product: Product,
    selectedSize: string,
    selectedLength: string,
    quantity: number = 1,
    customMeasurements?: CustomMeasurements
  ) => {
    const customSuffix = customMeasurements
      ? `-${Object.values(customMeasurements).join('-')}`
      : '';
    const itemId = `${product.id}-${selectedSize}-${selectedLength}${customSuffix}`;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: itemId,
            product,
            selectedSize,
            selectedLength,
            customMeasurements,
            quantity
          }
        ];
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => {
    const price = item.product.offerPrice ?? item.product.price;
    return acc + price * item.quantity;
  }, 0);

  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Free shipping over ₹5000
  const shippingFee = subtotal === 0 || subtotal >= 5000 ? 0 : 250;

  let discountAmount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const applyCouponCode = async (code: string): Promise<boolean> => {
    setCouponError(null);
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    try {
      // Validate coupon with Stack A coupon service
      const dbCoupon = await validateCoupon(cleanCode, subtotal);
      if (dbCoupon) {
        setAppliedCoupon({
          code: dbCoupon.code,
          discountType: dbCoupon.discount_type,
          discountValue: Number(dbCoupon.discount_value),
          minPurchase: Number(dbCoupon.min_purchase || 0),
          expiryDate: dbCoupon.expiry_date || '2030-12-31',
          active: Boolean(dbCoupon.active),
        });
        setCouponError(null);
        return true;
      }

      // Resilient fallback validation
      const result = await verifyCouponCode(cleanCode, subtotal);
      if (!result.valid || !result.coupon) {
        setCouponError(result.error || 'Invalid or expired coupon code.');
        return false;
      }

      setAppliedCoupon(result.coupon);
      setCouponError(null);
      return true;
    } catch {
      setCouponError('Failed to validate coupon.');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedCoupon,
        couponError,
        applyCouponCode,
        removeCoupon,
        subtotal,
        discountAmount,
        shippingFee,
        grandTotal,
        totalItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
