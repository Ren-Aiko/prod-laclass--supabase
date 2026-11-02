import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Order, Coupon, Review, Subscriber, ContactMessage, AdminStats, OrderStatus } from '../types';
import { 
  fetchOrders, 
  fetchCoupons, 
  fetchSubscribers, 
  fetchContactMessages,
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  updateProductStock as updateProductStockService,
  updateOrderStatus as updateOrderStatusService,
  restockCancelledOrder as restockCancelledOrderService,
  saveCoupon as saveCouponService,
  deleteCoupon as deleteCouponService,
  toggleReviewApproval as toggleReviewApprovalService,
  fetchAdminReviews as fetchAdminReviewsService,
  updateReview as updateReviewService
} from '../services/api';
import { 
  getSupabase, 
  isSupabaseConfigured, 
  setSupabaseUrl, 
  setSupabaseAnonKey,
  invokeEdgeFunction 
} from '../utils/supabase';
import { useStore } from './StoreContext';

interface AdminContextType {
  isAdminAuthenticated: boolean;
  isAdminAuthReady: boolean;
  adminEmail: string | null;
  loginAdmin: (email: string, password?: string, customUrl?: string, customAnonKey?: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  orders: Order[];
  coupons: Coupon[];
  subscribers: Subscriber[];
  contacts: ContactMessage[];
  reviews: Review[];
  stats: AdminStats;
  isLoadingAdminData: boolean;
  backendError: string | null;
  databaseConfigured: boolean;
  refreshAdminData: () => Promise<void>;
  refreshReviewModeration: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, courierName?: string, trackingNumber?: string) => Promise<boolean>;
  restockOrder: (orderId: string) => Promise<boolean>;
  saveProduct: (product: Partial<Product>, imageFiles?: (File | null)[]) => Promise<boolean>;
  updateProductStock: (id: string, quantity: number) => Promise<boolean>;
  deleteProduct: (productId: string, isGroup?: boolean) => Promise<boolean>;
  saveCoupon: (coupon: Coupon) => Promise<boolean>;
  deleteCoupon: (code: string) => Promise<boolean>;
  toggleReviewApproval: (reviewId: string, approved: boolean) => Promise<boolean>;
  updateReview: (reviewId: string, changes: Pick<Review, 'customerName' | 'rating' | 'reviewText'>) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminAuthReady, setIsAdminAuthReady] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const { refreshStoreData } = useStore();

  const checkAdminPrivileges = async (supabase: any, user: any) => {
    const { data: adminRecord, error } = await supabase
      .from('admins')
      .select('id, email, role, is_active, auth_user_id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not verify administrator access: ${error.message}`);
    }

    return adminRecord;
  };

  // Restore authenticated Supabase session on application mount
  useEffect(() => {
    let authorizationCheckId = 0;

    const verifySession = async (supabase: any, session: any) => {
      const checkId = ++authorizationCheckId;
      setIsAdminAuthenticated(false);
      setIsAdminAuthReady(false);
      setAdminEmail(null);

      if (!session?.user) {
        setIsAdminAuthReady(true);
        return;
      }

      try {
        const adminRecord = await checkAdminPrivileges(supabase, session.user);
        if (checkId !== authorizationCheckId) return;

        if (adminRecord) {
          setIsAdminAuthenticated(true);
          setAdminEmail(adminRecord.email || session.user.email || null);
        } else {
          await supabase.auth.signOut();
        }
        if (checkId === authorizationCheckId) {
          setIsAdminAuthReady(true);
        }
      } catch (error) {
        if (checkId === authorizationCheckId) {
          console.error('[Administrator authorization check]:', error);
          setIsAdminAuthReady(true);
        }
      }
    };

    const restoreSession = async () => {
      if (!isSupabaseConfigured()) {
        setIsAdminAuthReady(true);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        await verifySession(supabase, session);
      } catch (err) {
        console.error('[Session restoration check]:', err);
        setIsAdminAuthReady(true);
      }
    };

    restoreSession();

    // Listen to Supabase auth state changes
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            authorizationCheckId += 1;
            setIsAdminAuthenticated(false);
            setIsAdminAuthReady(true);
            setAdminEmail(null);
          } else if (session?.user) {
            void verifySession(supabase, session);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }
    } catch (error) {
      console.error('[Supabase auth listener setup]:', error);
    }
  }, []);

  /**
   * Secure administrator login via Supabase Auth
   */
  const loginAdmin = async (
    emailOrSecret: string,
    password?: string,
    customUrl?: string,
    customAnonKey?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // If custom URL and key provided in modal, set them
    if (customUrl && customUrl.trim()) {
      setSupabaseUrl(customUrl.trim());
    }
    if (customAnonKey && customAnonKey.trim()) {
      setSupabaseAnonKey(customAnonKey.trim());
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase URL and Anon Key are required. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      };
    }

    const email = emailOrSecret.trim();
    const pwd = password || '';

    if (!email || !pwd) {
      return { success: false, error: 'Please enter both Administrator Email and Password.' };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Invalid credentials. Please verify your email and password.'
        };
      }

      let adminRecord;
      try {
        adminRecord = await checkAdminPrivileges(supabase, data.user);
      } catch (verificationError) {
        await supabase.auth.signOut();
        throw verificationError;
      }
      if (!adminRecord) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'This account is not registered as an active administrator.'
        };
      }

      setIsAdminAuthenticated(true);
      setAdminEmail(adminRecord.email || data.user.email || email);
      
      try {
        await refreshAdminData();
      } catch (refreshErr) {
        console.warn('[refreshAdminData]:', refreshErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Admin Login Error]:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during authentication.' };
    }
  };

  const logoutAdmin = async () => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      }
    } catch {}
    setIsAdminAuthenticated(false);
    setAdminEmail(null);
  };

  const refreshAdminData = async () => {
    setIsLoadingAdminData(true);
    setBackendError(null);
    try {
      const [ordsRes, cpsRes, subsRes, cntsRes, reviewsRes] = await Promise.allSettled([
        fetchOrders(),
        fetchCoupons(),
        fetchSubscribers(),
        fetchContactMessages(),
        fetchAdminReviewsService()
      ]);

      if (ordsRes.status === 'fulfilled') {
        setOrders(ordsRes.value);
      } else {
        const err = ordsRes.reason?.message || 'Failed to fetch orders from Supabase';
        setBackendError(err);
        console.warn('[Admin fetchOrders error]:', err);
      }

      if (cpsRes.status === 'fulfilled') setCoupons(cpsRes.value);
      if (subsRes.status === 'fulfilled') setSubscribers(subsRes.value);
      if (cntsRes.status === 'fulfilled') setContacts(cntsRes.value);
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value);
      else console.warn('[Admin fetchReviews error]:', reviewsRes.reason);

      await refreshStoreData();
    } catch (e: any) {
      console.error('Error fetching admin data:', e);
      setBackendError(e.message || 'Error communicating with Supabase');
    } finally {
      setIsLoadingAdminData(false);
    }
  };

  const refreshReviewModeration = async () => {
    try {
      setReviews(await fetchAdminReviewsService());
    } catch (err) {
      console.warn('[Admin fetchReviews error]:', err);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      refreshAdminData();
    }
  }, [isAdminAuthenticated]);

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    courierName?: string,
    trackingNumber?: string
  ): Promise<boolean> => {
    try {
      const success = await updateOrderStatusService(orderId, status, courierName, trackingNumber);
      if (success) {
        setOrders(prev => prev.map(o => {
          if (o.orderId === orderId || o.id === orderId) {
            return {
              ...o,
              status,
              courierName: courierName || o.courierName,
              trackingNumber: trackingNumber || o.trackingNumber,
            };
          }
          return o;
        }));
      }
      return success;
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      throw err;
    }
  };

  const restockOrder = async (orderId: string): Promise<boolean> => {
    try {
      const success = await restockCancelledOrderService(orderId);
      if (success) {
        await refreshAdminData();
      }
      return success;
    } catch (err: any) {
      console.error('Failed to restock order:', err);
      throw err;
    }
  };

  const saveProduct = async (product: Partial<Product>, imageFiles?: (File | null)[]) => {
    const success = await createProductService(product, imageFiles);
    if (success) {
      await refreshStoreData();
    }
    return success;
  };

  const updateProductStock = async (id: string, quantity: number) => {
    const success = await updateProductStockService(id, quantity);
    if (success) {
      await refreshStoreData();
    }
    return success;
  };

  const deleteProduct = async (productId: string, isGroup?: boolean) => {
    const success = await deleteProductService(productId, isGroup);
    if (success) {
      await refreshStoreData();
    }
    return success;
  };

  const saveCoupon = async (coupon: Coupon) => {
    const success = await saveCouponService(coupon);
    if (success) {
      setCoupons(prev => {
        const idx = prev.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase());
        if (idx >= 0) {
          const c = [...prev];
          c[idx] = coupon;
          return c;
        }
        return [coupon, ...prev];
      });
    }
    return success;
  };

  const deleteCoupon = async (code: string) => {
    const success = await deleteCouponService(code);
    if (success) {
      setCoupons(prev => prev.filter(c => c.code.toUpperCase() !== code.toUpperCase()));
    }
    return success;
  };

  const toggleReviewApproval = async (reviewId: string, approved: boolean) => {
    await toggleReviewApprovalService(reviewId, approved);
    setReviews(prev => prev.map(review => review.id === reviewId ? { ...review, approved } : review));
    await refreshStoreData();
    return true;
  };

  const updateReview = async (reviewId: string, changes: Pick<Review, 'customerName' | 'rating' | 'reviewText'>) => {
    await updateReviewService(reviewId, changes);
    setReviews(prev => prev.map(review => review.id === reviewId ? { ...review, ...changes } : review));
    await refreshStoreData();
    return true;
  };

  // High-level stats
  const totalRevenue = orders
    .filter(o => o.status === 'Payment Confirmed' || o.status === 'Shipped' || o.status === 'Delivered')
    .reduce((acc, o) => acc + o.grandTotal, 0);

  const totalOrders = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / Math.max(1, totalOrders)) : 0;

  const stats: AdminStats = {
    totalRevenue,
    totalOrders,
    totalProducts: orders.length,
    totalSubscribers: subscribers.length,
    pendingOrdersCount,
    avgOrderValue
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminAuthenticated,
        isAdminAuthReady,
        adminEmail,
        loginAdmin,
        logoutAdmin,
        orders,
        coupons,
        subscribers,
        contacts,
        reviews,
        stats,
        isLoadingAdminData,
        backendError,
        databaseConfigured: isSupabaseConfigured(),
        refreshAdminData,
        refreshReviewModeration,
        updateOrderStatus,
        restockOrder,
        saveProduct,
        updateProductStock,
        deleteProduct,
        saveCoupon,
        deleteCoupon,
        toggleReviewApproval,
        updateReview
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
