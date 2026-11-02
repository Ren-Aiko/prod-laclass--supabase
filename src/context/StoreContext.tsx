import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CategoryType, Review, Order, SubscribeResult } from '../types';
import { 
  fetchProducts, 
  fetchCategories, 
  fetchReviews, 
  addReview,
  subscribeToNewsletter,
  sendContactMessage
} from '../services/api';
import { isSupabaseConfigured } from '../utils/supabase';

interface StoreContextType {
  products: Product[];
  categories: string[];
  isLoadingProducts: boolean;
  dbError: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedFabric: string;
  setSelectedFabric: (fabric: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  sortOption: string;
  setSortOption: (sort: string) => void;
  filteredProducts: Product[];
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  reviews: Review[];
  addCustomerReview: (productId: string, productName: string, customerName: string, rating: number, reviewText: string) => Promise<boolean>;
  updateReviewApprovalState: (reviewId: string, approved: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  isSizeGuideOpen: boolean;
  setIsSizeGuideOpen: (open: boolean) => void;
  refreshStoreData: () => Promise<void>;
  subscribeNewsletter: (email: string) => Promise<SubscribeResult>;
  submitContactForm: (name: string, email: string, phone: string, message: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Static mock product items removed completely
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All', 'Premium', 'Bridal', 'Casual', 'Luxury']);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [sortOption, setSortOption] = useState('featured');

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('laclasse_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      }
    } catch {}
    return [];
  });

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const refreshStoreData = async () => {
    setIsLoadingProducts(true);
    setDbError(null);
    try {
      const [prodsRes, catsRes, revsRes] = await Promise.allSettled([
        fetchProducts(),
        fetchCategories(),
        fetchReviews()
      ]);

      // Handle products response
      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value || []);
        setDbError(null);
      } else {
        setProducts([]);
        setDbError(prodsRes.reason?.message || 'Trouble connecting to our servers.');
      }

      // Handle categories response
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
        const unique = Array.from(new Set(['All', ...catsRes.value]));
        setCategories(unique);
      } else {
        setCategories(['All', 'Premium', 'Bridal', 'Casual', 'Luxury']);
      }

      // Handle reviews response
      if (revsRes.status === 'fulfilled' && Array.isArray(revsRes.value)) {
        setReviews(revsRes.value);
      }
    } catch (e: any) {
      console.warn('StoreContext refreshStoreData error:', e);
      setProducts([]);
      setDbError(e?.message || 'Trouble connecting to our servers.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    refreshStoreData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('laclasse_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const updateReviewApprovalState = (reviewId: string, approved: boolean) => {
    setReviews((prev) => prev.map(r => r.id === reviewId ? { ...r, approved } : r));
  };

  const addCustomerReview = async (
    productId: string,
    productName: string,
    customerName: string,
    rating: number,
    reviewText: string
  ): Promise<boolean> => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId,
      productName,
      customerName,
      rating,
      reviewText,
      date: new Date().toISOString().split('T')[0],
      approved: false,
      verifiedPurchase: true
    };
    const success = await addReview(newRev);
    if (success) {
      setReviews((prev) => [newRev, ...prev]);
    }
    return success;
  };

  const subscribeNewsletter = async (email: string): Promise<SubscribeResult> => {
    return await subscribeToNewsletter(email);
  };

  const submitContactForm = async (
    name: string,
    email: string,
    phone: string,
    message: string
  ): Promise<boolean> => {
    return await sendContactMessage({
      id: `cnt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      name,
      email,
      phone,
      message,
      status: 'Unread'
    });
  };

  // Compute filtered products
  const filteredProducts = products.filter((product) => {
    if (!product.active) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = product.name?.toLowerCase().includes(q);
      const matchDesc = product.description?.toLowerCase().includes(q);
      const matchFabric = product.fabric?.toLowerCase().includes(q);
      const matchCategory = product.category?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchFabric && !matchCategory) return false;
    }

    // Category
    if (selectedCategory !== 'All' && product.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // Fabric
    if (selectedFabric !== 'All' && product.fabric !== selectedFabric) {
      return false;
    }

    // Price
    const effectivePrice = product.offerPrice ?? product.price;
    if (effectivePrice < priceRange[0] || effectivePrice > priceRange[1]) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const priceA = a.offerPrice ?? a.price;
    const priceB = b.offerPrice ?? b.price;

    if (sortOption === 'price-low') return priceA - priceB;
    if (sortOption === 'price-high') return priceB - priceA;
    if (sortOption === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortOption === 'rating') return b.rating - a.rating;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        isLoadingProducts,
        dbError,
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
        filteredProducts,
        wishlist,
        toggleWishlist,
        reviews,
        addCustomerReview,
        updateReviewApprovalState,
        quickViewProduct,
        setQuickViewProduct,
        isSizeGuideOpen,
        setIsSizeGuideOpen,
        isSearchOpen,
        setIsSearchOpen,
        refreshStoreData,
        subscribeNewsletter,
        submitContactForm
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
