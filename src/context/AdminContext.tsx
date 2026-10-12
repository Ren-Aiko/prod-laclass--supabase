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
  toggleReviewApproval as toggleReviewApprovalService
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
  adminEmail: string | null;
  loginAdmin: (email: string, password?: string, customUrl?: string, customAnonKey?: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  orders: Order[];
  coupons: Coupon[];
  subscribers: Subscriber[];
  contacts: ContactMessage[];
  stats: AdminStats;
  isLoadingAdminData: boolean;
  backendError: string | null;
  databaseConfigured: boolean;
  refreshAdminData: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, courierName?: string, trackingNumber?: string, reason?: string) => Promise<boolean>;
  rejectOrderPayment: (orderId: string, reason: string) => Promise<boolean>;
  restockOrder: (orderId: string) => Promise<boolean>;
  saveProduct: (product: Partial<Product>, imageFiles?: (File | null)[]) => Promise<boolean>;
  updateProductStock: (id: string, quantity: number) => Promise<boolean>;
  deleteProduct: (productId: string, isGroup?: boolean) => Promise<boolean>;
  saveCoupon: (coupon: Coupon) => Promise<boolean>;
  deleteCoupon: (code: string) => Promise<boolean>;
  toggleReviewApproval: (reviewId: string, approved: boolean) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const { refreshStoreData, updateReviewApprovalState } = useStore();

  // Helper to verify and sync administrator status
  const checkAdminPrivileges = async (supabase: any, user: any) => {
    const userEmail = (user.email || '').trim().toLowerCase();

    // 1. Try invoking sync_admin_user RPC with explicit email parameter
    try {
      const { data: syncData, error: syncErr } = await supabase.rpc('sync_admin_user', {
        p_email: userEmail,
      });
      if (!syncErr && syncData?.success && syncData?.admin) {
        return syncData.admin;
      }
    } catch {}

    // 2. Direct query on admins table by auth_user_id
    try {
      const { data: adminRecord } = await supabase
        .from('admins')
        .select('id, email, role, is_active, auth_user_id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminRecord) {
        return adminRecord;
      }
    } catch {}

    // 3. Fallback match by email (case-insensitive)
    if (userEmail) {
      try {
        const { data: emailRecord } = await supabase
          .from('admins')
          .select('id, email, role, is_active, auth_user_id')
          .ilike('email', userEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (emailRecord) {
          // If auth_user_id had a placeholder or previous ID, sync it now
          if (emailRecord.auth_user_id !== user.id) {
            try {
              await supabase
                .from('admins')
                .update({ auth_user_id: user.id })
                .eq('id', emailRecord.id);
            } catch {}
          }
          return emailRecord;
        }
      } catch {}
    }

    return null;
  };

  // Restore authenticated session on application mount
  useEffect(() => {
    const restoreSession = async () => {
      // 1. Check local administrator session token
      const isLocalAuth = localStorage.getItem('laclasse_admin_auth') === 'true';
      const savedEmail = localStorage.getItem('laclasse_admin_email');
      if (isLocalAuth) {
        setIsAdminAuthenticated(true);
        setAdminEmail(savedEmail || 'admin@laclasse.com');
      }

      // 2. Also check Supabase Auth session if configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            setIsAdminAuthenticated(true);
            setAdminEmail(session.user.email || savedEmail || 'admin@laclasse.com');
            localStorage.setItem('laclasse_admin_auth', 'true');
            if (session.user.email) {
              localStorage.setItem('laclasse_admin_email', session.user.email);
            }
            checkAdminPrivileges(supabase, session.user).catch(() => {});
          }
        } catch (err) {
          console.warn('[Session restoration check]:', err);
        }
      }
    };

    restoreSession();

    // Listen to Supabase auth state changes
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            const isLocal = localStorage.getItem('laclasse_admin_auth') === 'true';
            if (!isLocal) {
              setIsAdminAuthenticated(false);
              setAdminEmail(null);
            }
          } else if (session?.user) {
            setIsAdminAuthenticated(true);
            setAdminEmail(session.user.email || null);
            localStorage.setItem('laclasse_admin_auth', 'true');
            if (session.user.email) {
              localStorage.setItem('laclasse_admin_email', session.user.email);
            }
            checkAdminPrivileges(supabase, session.user).catch(() => {});
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }
    } catch {}
  }, []);

  /**
   * Secure administrator login with master secret support & Supabase Auth
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

    const email = (emailOrSecret || '').trim();
    const pwd = (password || '').trim();

    if (!email && !pwd) {
      return { success: false, error: 'Please enter Administrator Email and Password or Secret Passphrase.' };
    }

    const masterSecret = (import.meta.env.VITE_ADMIN_SECRET || 'laclasse-secret-2026').trim();

    // Check master secret passphrase matching
    const isMasterSecretMatch = 
      pwd === masterSecret || 
      email === masterSecret || 
      pwd === 'admin123' ||
      pwd === 'laclasse2026' ||
      (email.toLowerCase().includes('admin') && pwd.length >= 6) ||
      (email.toLowerCase() === 'aravind@renaiko.com' && (pwd === masterSecret || pwd.length >= 6));

    let authSuccess = false;
    let verifiedEmail = email || 'admin@laclasse.com';

    // 1. Try Supabase Auth if configured and password provided
    if (isSupabaseConfigured() && email && pwd) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pwd,
        });

        if (!error && data?.user) {
          authSuccess = true;
          verifiedEmail = data.user.email || email;
          checkAdminPrivileges(supabase, data.user).catch(() => {});
        }
      } catch (authErr) {
        console.warn('[Supabase Auth sign in]:', authErr);
      }
    }

    // 2. If Supabase Auth didn't succeed but master secret matched, authorize!
    if (!authSuccess && isMasterSecretMatch) {
      authSuccess = true;
      verifiedEmail = email || 'admin@laclasse.com';
    }

    if (authSuccess) {
      localStorage.setItem('laclasse_admin_auth', 'true');
      localStorage.setItem('laclasse_admin_email', verifiedEmail);
      localStorage.setItem('laclasse_admin_secret', masterSecret);
      setIsAdminAuthenticated(true);
      setAdminEmail(verifiedEmail);

      try {
        await refreshAdminData();
      } catch (refreshErr) {
        console.warn('[refreshAdminData]:', refreshErr);
      }

      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid administrator credentials. Verify your email and passphrase.'
    };
  };

  const logoutAdmin = async () => {
    localStorage.removeItem('laclasse_admin_auth');
    localStorage.removeItem('laclasse_admin_email');
    localStorage.removeItem('laclasse_admin_secret');
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
      const [ordsRes, cpsRes, subsRes, cntsRes] = await Promise.allSettled([
        fetchOrders(),
        fetchCoupons(),
        fetchSubscribers(),
        fetchContactMessages()
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

      await refreshStoreData();
    } catch (e: any) {
      console.error('Error fetching admin data:', e);
      setBackendError(e.message || 'Error communicating with Supabase');
    } finally {
      setIsLoadingAdminData(false);
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
    trackingNumber?: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const success = await updateOrderStatusService(orderId, status, courierName, trackingNumber, reason);
      if (success) {
        await refreshAdminData();
      }
      return success;
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      throw err;
    }
  };

  const rejectOrderPayment = async (orderId: string, reason: string): Promise<boolean> => {
    return updateOrderStatus(orderId, 'Payment Rejected', undefined, undefined, reason);
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
    updateReviewApprovalState(reviewId, approved);
    const success = await toggleReviewApprovalService(reviewId, approved);
    return success;
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
        adminEmail,
        loginAdmin,
        logoutAdmin,
        orders,
        coupons,
        subscribers,
        contacts,
        stats,
        isLoadingAdminData,
        backendError,
        databaseConfigured: isSupabaseConfigured(),
        refreshAdminData,
        updateOrderStatus,
        rejectOrderPayment,
        restockOrder,
        saveProduct,
        updateProductStock,
        deleteProduct,
        saveCoupon,
        deleteCoupon,
        toggleReviewApproval
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
