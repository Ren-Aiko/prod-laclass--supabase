import React, { useState } from 'react';
import logo from '../assets/SVG-02 (12)-Photoroom.png';
import { 
  Shield, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Tag, 
  MessageSquare, 
  Mail, 
  Settings, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Check, 
  X, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  Star,
  ExternalLink,
  Save,
  CheckCircle2,
  RefreshCw,
  Truck,
  Image as ImageIcon,
  KeyRound,
  Globe,
  Upload,
  Loader2,
  Copy,
  Hash,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useStore } from '../context/StoreContext';
import { Product, Order, Coupon, Review, OrderStatus } from '../types';
import { getSupabaseUrl, setSupabaseUrl, getSupabaseAnonKey, setSupabaseAnonKey, getR2PublicUrl, setR2PublicUrl, invokeEdgeFunction } from '../utils/supabase';

interface AdminPageProps {
  onNavigate?: (page: string) => void;
  onOpenLoginModal?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, onOpenLoginModal }) => {
  const {
    isAdminAuthenticated,
    logoutAdmin,
    orders,
    coupons,
    subscribers,
    contacts,
    stats,
    backendError,
    refreshAdminData,
    updateOrderStatus,
    rejectOrderPayment,
    saveProduct,
    updateProductStock,
    deleteProduct,
    saveCoupon,
    deleteCoupon,
    toggleReviewApproval,
    restockOrder
  } = useAdmin();

  const { products, reviews, categories, dbError, refreshStoreData } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'coupons' | 'reviews' | 'subscribers' | 'contacts' | 'settings'>('dashboard');

  // Product Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingVariants, setEditingVariants] = useState<{ id?: string; size: string; length: string; quantity: number }[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [expandedProductGroup, setExpandedProductGroup] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<(File | null)[]>([null, null, null]);
  const [productImagePreviews, setProductImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingSlot, setIsUploadingSlot] = useState<number | null>(null);
  const [stockEditModal, setStockEditModal] = useState<{ id: string; name: string; size: string; length?: string; quantity: number } | null>(null);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isReleasingExpired, setIsReleasingExpired] = useState(false);

  // Coupon Modal State
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  // Orders Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const handleCopyUtr = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  const handleRestockOrder = async (orderId: string) => {
    if (!confirm(`Restore standard inventory for cancelled order ${orderId}?`)) return;
    try {
      await restockOrder(orderId);
      alert(`Order ${orderId} inventory successfully restocked!`);
    } catch (err: any) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  // Payment Rejection Modal State
  const [rejectionModal, setRejectionModal] = useState<{ orderId: string; reason: string } | null>(null);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModal) return;
    setIsSubmittingRejection(true);
    try {
      await rejectOrderPayment(rejectionModal.orderId, rejectionModal.reason || 'Payment verification failed');
      setRejectionModal(null);
    } catch (err: any) {
      alert(`Error rejecting payment: ${err.message}`);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleReleaseExpired = async () => {
    setIsReleasingExpired(true);
    try {
      const data = await invokeEdgeFunction<any>('release-expired-reservations', { method: 'POST' });
      const releasedCount = data?.released_count ?? data?.releasedCount ?? 0;
      alert(`Reservation Expiry & Restoration Job executed!\nReleased ${releasedCount} expired orders.`);
      await refreshAdminData();
    } catch (err: any) {
      alert(`Failed to run expiry job: ${err.message}`);
    } finally {
      setIsReleasingExpired(false);
    }
  };

  // Payment Proof Modal State
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Mark as Shipped Dialog State
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isShippingUpdating, setIsShippingUpdating] = useState(false);

  // Settings State
  const [settingsSupabaseUrl, setSettingsSupabaseUrl] = useState(() => getSupabaseUrl());
  const [settingsAnonKey, setSettingsAnonKey] = useState(() => getSupabaseAnonKey());
  const [settingsR2Url, setSettingsR2Url] = useState(() => getR2PublicUrl());
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  // Reviews Processing State
  const [processingReviewId, setProcessingReviewId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleLogout = () => {
    logoutAdmin();
    if (onNavigate) {
      onNavigate('home');
    }
  };

  // Status transitions
  const handleConfirmPayment = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'Payment Confirmed');
    } catch (err: any) {
      alert(`Error confirming payment: ${err.message}`);
    }
  };

  const handleOpenShipDialog = (orderId: string) => {
    setShippingOrderId(orderId);
    setCourierName('BlueDart Express');
    setTrackingNumber(`BD${Math.floor(100000000 + Math.random() * 900000000)}IN`);
  };

  const handleSubmitShipDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrderId) return;
    if (!courierName || !trackingNumber) {
      alert('Courier Name and Tracking Number are required.');
      return;
    }

    setIsShippingUpdating(true);
    try {
      await updateOrderStatus(shippingOrderId, 'Shipped', courierName, trackingNumber);
      setShippingOrderId(null);
    } catch (err: any) {
      alert(`Error updating shipping status: ${err.message}`);
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'Delivered');
    } catch (err: any) {
      alert(`Error marking delivered: ${err.message}`);
    }
  };

  const handleProductImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFiles = [...productImages];
    newFiles[index] = file;
    setProductImages(newFiles);

    const reader = new FileReader();
    reader.onload = () => {
      const newPreviews = [...productImagePreviews];
      newPreviews[index] = reader.result as string;
      setProductImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct({
        ...product,
        id: product.id,
        productId: product.productId || product.product_id || product.id,
        product_id: product.productId || product.product_id || product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        fabric: product.fabric,
        price: product.price,
        originalPrice: product.originalPrice ?? product.original_price,
        original_price: product.originalPrice ?? product.original_price,
        offerPrice: product.offerPrice ?? product.offer_price,
        offer_price: product.offerPrice ?? product.offer_price,
        description: product.description,
        collection: product.collection,
        badge: (product as any).badge || '',
        newArrival: product.newArrival ?? true,
        is_new_arrival: product.newArrival ?? true,
        featured: product.featured ?? false,
        is_featured: product.featured ?? false,
        active: product.active !== false,
        is_active: product.active !== false ? 1 : 0,
      });
      setProductImages([null, null, null]);
      setProductImagePreviews([
        product.image1 || product.images?.[0] || product.thumbnail || null,
        product.image2 || product.images?.[1] || null,
        product.image3 || product.images?.[2] || null
      ]);
      setEditingVariants(
        product.variants && product.variants.length > 0
          ? product.variants.map(v => ({ id: v.id, size: v.size, length: v.length || '56"', quantity: v.quantity }))
          : [{ size: product.size || 'Free Size', length: product.length || '56"', quantity: product.quantity ?? 1 }]
      );
    } else {
      const newPId = `LC00${Math.floor(10 + Math.random() * 90)}`;
      setEditingProduct({
        id: `prod_${Date.now()}`,
        productId: newPId,
        product_id: newPId,
        name: '',
        slug: '',
        category: 'Luxury',
        fabric: 'Dubai Nida',
        price: 14999,
        originalPrice: 17999,
        original_price: 17999,
        description: '',
        collection: 'Luxury Signature',
        badge: 'New Arrival',
        featured: false,
        is_featured: false,
        newArrival: true,
        is_new_arrival: true,
        active: true,
        is_active: 1,
      });
      setProductImages([null, null, null]);
      setProductImagePreviews([null, null, null]);
      setEditingVariants([
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]);
    }
    setIsProductModalOpen(true);
  };

  const handleRemoveImageSlot = async (slotIndex: number) => {
    const currentUrl = productImagePreviews[slotIndex];

    const newPreviews = [...productImagePreviews];
    newPreviews[slotIndex] = null;
    setProductImagePreviews(newPreviews);

    const newFiles = [...productImages];
    newFiles[slotIndex] = null;
    setProductImages(newFiles);

    const keyToUpdate = slotIndex === 0 ? 'image1' : slotIndex === 1 ? 'image2' : 'image3';
    setEditingProduct(prev => prev ? ({ ...prev, [keyToUpdate]: '' }) : null);

    if (currentUrl) {
      try {
        await invokeEdgeFunction('r2-images', {
          method: 'DELETE',
          body: { url: currentUrl }
        });
      } catch {}
    }
  };

  const handleAddExtraSize = (product: Product) => {
    setEditingProduct({
      id: `prod_${Date.now()}`,
      productId: product.productId || product.product_id,
      product_id: product.productId || product.product_id,
      name: product.name,
      category: product.category,
      fabric: product.fabric,
      price: product.price,
      originalPrice: product.originalPrice ?? product.original_price,
      original_price: product.originalPrice ?? product.original_price,
      description: product.description,
      collection: product.collection,
      length: product.length || '56"',
      size: 'XXL',
      quantity: 1,
      image1: product.image1,
      image2: product.image2,
      image3: product.image3,
      featured: product.featured,
    });
    setProductImages([null, null, null]);
    setProductImagePreviews([
      product.image1 || product.thumbnail || null,
      product.image2 || null,
      product.image3 || null
    ]);
    setIsProductModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEditModal) return;
    setIsUpdatingStock(true);
    try {
      await updateProductStock(stockEditModal.id, stockEditModal.quantity);
      setStockEditModal(null);
    } catch (err: any) {
      alert(`Error updating stock: ${err.message}`);
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) {
      alert('Product name and price are required.');
      return;
    }

    setIsSavingProduct(true);
    try {
      const updatedImages = {
        image1: editingProduct.image1 || '',
        image2: editingProduct.image2 || '',
        image3: editingProduct.image3 || ''
      };

      // Upload newly selected image files to R2
      for (let i = 0; i < 3; i++) {
        const file = productImages[i];
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('product_id', editingProduct.productId || editingProduct.product_id || editingProduct.id || 'garment');
          formData.append('slot', String(i + 1));

          const uploadData = await invokeEdgeFunction<any>('r2-images', {
            method: 'POST',
            body: formData
          });

          if (uploadData?.url) {
            if (i === 0) updatedImages.image1 = uploadData.url;
            if (i === 1) updatedImages.image2 = uploadData.url;
            if (i === 2) updatedImages.image3 = uploadData.url;
          }
        }
      }

      // Save each variant configured under this garment
      if (editingVariants.length > 0) {
        for (const v of editingVariants) {
          await saveProduct({
            ...editingProduct,
            ...updatedImages,
            size: v.size,
            length: v.length,
            quantity: v.quantity
          });
        }
      } else {
        await saveProduct({
          ...editingProduct,
          ...updatedImages
        });
      }

      setIsProductModalOpen(false);
      await refreshAdminData();
    } catch (err: any) {
      alert(`Failed to save product: ${err.message}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSaveCouponForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || !editingCoupon?.discountValue) return;

    const coupon: Coupon = {
      code: editingCoupon.code.toUpperCase(),
      discountType: editingCoupon.discountType || 'percentage',
      discountValue: Number(editingCoupon.discountValue),
      minPurchase: Number(editingCoupon.minPurchase || 0),
      expiryDate: editingCoupon.expiryDate || '2026-12-31',
      active: true,
    };

    await saveCoupon(coupon);
    setIsCouponModalOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseUrl(settingsSupabaseUrl);
    setSupabaseAnonKey(settingsAnonKey);
    setR2PublicUrl(settingsR2Url);
    setSettingsSavedMsg(true);
    setTimeout(() => setSettingsSavedMsg(false), 3000);
    refreshAdminData();
  };

  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address', 'Total', 'UTR Number', 'Status', 'Payment Proof', 'Courier', 'Tracking'];
    const rows = orders.map(o => [
      o.orderId,
      o.date,
      `"${o.customer.fullName}"`,
      o.customer.email,
      o.customer.phone,
      `"${o.customer.address}"`,
      o.grandTotal,
      `"${o.utrNumber || o.utr_number || ''}"`,
      o.status,
      o.paymentProofUrl || '',
      o.courierName || '',
      o.trackingNumber || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laclasse_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="bg-[#121212] text-[#FAF8F5] min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-[#1C1B1A] border border-[#2D2B28] p-8 rounded-xs shadow-2xl">
          <Shield className="w-12 h-12 text-[#D4AF37] mx-auto" />
          <h2 className="font-serif text-2xl font-medium">Administrator Authorization Required</h2>
          <p className="text-xs text-[#A09A92]">
            Please authenticate using your verified administrator credentials to access the Atelier Dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onOpenLoginModal ? onOpenLoginModal() : (window.location.href = '/')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#8C7853] hover:bg-[#A08B63] text-white font-medium text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer"
            >
              Sign In to Admin Portal
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#262422] hover:bg-[#3D3A36] text-[#FAF8F5] text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer"
              >
                Back to Storefront
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141312] text-[#E8E6E3] flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#1C1B1A] border-r border-[#2A2927] p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LA.CLASSÈ" className="h-9 w-auto object-contain brightness-0 invert" />
            <div>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#D4AF37] block font-semibold">Atelier Admin</span>
              <span className="text-xs font-serif font-medium text-[#FAF8F5]">Cloudflare Edition</span>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'orders' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </div>
              {orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length > 0 && (
                <span className="bg-[#e65100] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'products' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'coupons' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons ({coupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'reviews' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Reviews</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs transition-colors ${
                activeTab === 'settings' ? 'bg-[#8C7853] text-[#FAF8F5]' : 'text-[#A09A92] hover:bg-[#262422] hover:text-[#FAF8F5]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Supabase & R2 Settings</span>
            </button>
          </nav>
        </div>

        <div className="pt-8 border-t border-[#2A2927] space-y-4">
          <div className="text-[10px] text-[#A09A92] leading-relaxed">
            Backend Engine: <br />
            <strong className="text-[#a5d6a7]">Supabase PostgreSQL + Edge Functions & R2</strong>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-[#ff8080] hover:text-white py-2 uppercase tracking-wider cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto space-y-6">

        {/* Global Admin Alert Banner (displays exact backend error reason if D1 empty or Worker error) */}
        {(dbError || backendError) && (
          <div className="bg-[#2d1212] border border-[#a83232] text-[#ffb4b4] p-4 rounded-xs text-xs flex items-start justify-between gap-4 shadow-lg animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ff8080] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block uppercase tracking-wider text-[11px] text-[#ff8080]">
                  Backend Diagnostic Notice:
                </span>
                <p className="font-mono text-[11px] leading-relaxed">
                  {dbError || backendError}
                </p>
                <p className="text-[10px] text-[#D1CDC7]">
                  Ensure Supabase project URL, Anon Key, and Edge Functions are configured and operational.
                </p>
              </div>
            </div>
            <button 
              onClick={() => { refreshStoreData(); refreshAdminData(); }}
              className="bg-[#1C1B1A] border border-[#4d2222] hover:border-[#ff8080] text-xs px-3 py-1.5 rounded-xs flex items-center gap-1.5 shrink-0 text-[#FAF8F5]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Atelier Executive Dashboard</h1>
                <p className="text-xs text-[#A09A92] mt-1">Supabase & Cloudflare R2 Real-Time Order Metrics</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportOrdersCSV}
                  className="bg-[#1C1B1A] border border-[#3A3835] hover:border-[#8C7853] px-4 py-2 text-xs uppercase tracking-wider font-medium text-[#FAF8F5] rounded-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Export Orders CSV</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-2">
                <div className="flex items-center justify-between text-[#A09A92] text-xs font-medium uppercase tracking-wider">
                  <span>Confirmed Revenue</span>
                  <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="font-serif text-3xl font-semibold text-[#FAF8F5]">
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-[#2e7d32] font-semibold">Verified Bank Receipts</span>
              </div>

              <div className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-2">
                <div className="flex items-center justify-between text-[#A09A92] text-xs font-medium uppercase tracking-wider">
                  <span>Total Orders</span>
                  <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="font-serif text-3xl font-semibold text-[#FAF8F5]">
                  {stats.totalOrders}
                </div>
                <span className="text-[10px] text-[#e65100]">
                  {orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length} Awaiting Confirmation
                </span>
              </div>

              <div className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-2">
                <div className="flex items-center justify-between text-[#A09A92] text-xs font-medium uppercase tracking-wider">
                  <span>Catalog Garments</span>
                  <Package className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="font-serif text-3xl font-semibold text-[#FAF8F5]">
                  {products.length}
                </div>
                <span className="text-[10px] text-[#A09A92]">Active Pieces in Catalog</span>
              </div>

              <div className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-2">
                <div className="flex items-center justify-between text-[#A09A92] text-xs font-medium uppercase tracking-wider">
                  <span>Active Categories</span>
                  <Tag className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="font-serif text-3xl font-semibold text-[#FAF8F5]">
                  {categories.filter(c => c !== 'All').length}
                </div>
                <span className="text-[10px] text-[#A09A92]">Dynamic Collections</span>
              </div>
            </div>

            {/* Quick Action Banner for Pending Confirmation */}
            {orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length > 0 && (
              <div className="bg-[#241a10] border border-[#d97706]/40 p-5 rounded-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#d97706]" />
                  <div>
                    <h4 className="text-sm font-medium text-[#fde68a]">
                      {orders.filter(o => o.status === 'Paid, Awaiting Confirmation').length} New Order(s) Need Payment Reconciliation
                    </h4>
                    <p className="text-xs text-[#d1cdc7]">
                      Customers have uploaded bank transfer receipts awaiting verification.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOrderStatusFilter('Paid, Awaiting Confirmation');
                    setActiveTab('orders');
                  }}
                  className="bg-[#d97706] hover:bg-[#b45309] text-white px-4 py-2 rounded-xs text-xs uppercase tracking-wider font-semibold"
                >
                  Review Proofs
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT & STATE MACHINE */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Orders & State Machine</h1>
                <p className="text-xs text-[#A09A92]">
                  Manage order lifecycle: Paid, Awaiting Confirmation &rarr; Payment Confirmed &rarr; Shipped &rarr; Delivered.
                </p>
              </div>

              <button
                onClick={exportOrdersCSV}
                className="bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#1C1B1A] border border-[#2D2B28] p-4 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search Order ID, name, or phone..."
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 pl-8 rounded-xs text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                />
                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-3" />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-[#A09A92] shrink-0">Filter Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="w-full sm:w-auto bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] focus:outline-none"
                >
                  <option value="All">All Statuses ({orders.length})</option>
                  <option value="Paid, Awaiting Confirmation">Paid, Awaiting Confirmation</option>
                  <option value="Payment Confirmed">Payment Confirmed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled / Refunded</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2D2B28] text-[#A09A92] uppercase text-[10px] tracking-wider bg-[#141312]">
                    <th className="p-3.5">Order ID & Date</th>
                    <th className="p-3.5">Customer & Delivery</th>
                    <th className="p-3.5">Ordered Items</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">UTR / Bank Verification</th>
                    <th className="p-3.5">Current Lifecycle Status</th>
                    <th className="p-3.5 text-right">State Machine Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2B28] text-[#D1CDC7]">
                  {orders
                    .filter(o => {
                      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
                      if (orderSearch) {
                        const q = orderSearch.toLowerCase();
                        return o.orderId.toLowerCase().includes(q) || 
                               o.customer.fullName.toLowerCase().includes(q) ||
                               o.customer.phone.includes(q) ||
                               (o.utrNumber && o.utrNumber.toLowerCase().includes(q));
                      }
                      return true;
                    })
                    .map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-[#242220]">
                        <td className="p-3.5">
                          <span className="font-semibold text-[#FAF8F5] block font-mono">{ord.orderId}</span>
                          <span className="text-[10px] text-[#A09A92]">{ord.date}</span>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <strong className="text-[#FAF8F5] block">{ord.customer.fullName}</strong>
                          <span className="text-[10px] text-[#A09A92] block">{ord.customer.phone}</span>
                          <span className="text-[10px] text-[#888888] line-clamp-1">{ord.customer.address}</span>
                          {(ord.customer?.notes || ord.notes) && (
                            <div className="text-[10px] text-[#D4AF37] italic mt-1 leading-tight line-clamp-2">
                              "{ord.customer?.notes || ord.notes}"
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          {ord.items.map((i, idx) => (
                            <div key={idx} className="text-[11px] mb-1">
                              <div>{i.name} ({i.size}{i.length ? ` / ${i.length}` : ''}) x{i.quantity}</div>
                              {i.custom_measurements && (
                                <div className="text-[9px] text-[#D4AF37] leading-tight">
                                  Bespoke Measurements attached
                                </div>
                              )}
                            </div>
                          ))}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-[#FAF8F5]">
                            ₹{ord.grandTotal.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-[#A09A92] block">
                            {ord.paymentMethod || ord.payment_method || 'Bank Transfer'}
                          </span>
                          <div className="mt-1">
                            {(() => {
                              const isExp = ord.reservation_expires_at 
                                ? new Date(ord.reservation_expires_at).getTime() <= Date.now() 
                                : false;
                              const resStatus = ord.reservation_status || 'reserved';

                              if (resStatus === 'committed') {
                                return (
                                  <span className="text-[9px] text-[#6ee7b7] bg-[#064e3b]/60 px-1.5 py-0.5 rounded-xs inline-block">
                                    ✓ Stock Locked
                                  </span>
                                );
                              }
                              if (resStatus === 'released') {
                                return (
                                  <span className="text-[9px] text-[#a1a1aa] bg-[#27272a] px-1.5 py-0.5 rounded-xs inline-block">
                                    Stock Released
                                  </span>
                                );
                              }
                              if (resStatus === 'reserved') {
                                if (isExp) {
                                  return (
                                    <span className="text-[9px] text-[#fca5a5] bg-[#450a0a] px-1.5 py-0.5 rounded-xs inline-block font-semibold">
                                      ⚠️ Expired Reservation
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[9px] text-[#fde047] bg-[#422006] px-1.5 py-0.5 rounded-xs inline-block">
                                    ⏳ Reserved (Active)
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[9px] text-[#A09A92]">
                                  {resStatus}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* UTR Verification & Payment Proof */}
                        <td className="p-3.5">
                          <div className="space-y-1.5">
                            {(ord.utrNumber || ord.utr_number) ? (
                              <div className="flex items-center gap-1.5 bg-[#141312] border border-[#3A3835] px-2 py-1 rounded-xs w-fit">
                                <Hash className="w-3 h-3 text-[#D4AF37]" />
                                <span className="font-mono text-[11px] text-[#FAF8F5] font-semibold tracking-wide">
                                  {ord.utrNumber || ord.utr_number}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(ord.utrNumber || ord.utr_number || '')}
                                  title="Copy UTR to reconcile bank credit"
                                  className="text-[#A09A92] hover:text-[#D4AF37] p-0.5 cursor-pointer ml-1"
                                >
                                  {copiedUtr === (ord.utrNumber || ord.utr_number) ? (
                                    <Check className="w-3 h-3 text-[#6ee7b7]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#777777]">No UTR provided</span>
                            )}

                            {ord.paymentProofUrl && (
                              <button
                                onClick={() => setViewingProofUrl(ord.paymentProofUrl || null)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#262422] hover:bg-[#3D3A36] text-[#D4AF37] border border-[#3D3A36] rounded-xs text-[10px] cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Receipt Screenshot</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Lifecycle Status Badge */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              ord.status === 'Paid, Awaiting Confirmation'
                                ? 'bg-[#422006] text-[#fde047] border border-[#d97706]/40'
                                : ord.status === 'Payment Confirmed'
                                ? 'bg-[#064e3b] text-[#6ee7b7] border border-[#10b981]/40'
                                : ord.status === 'Shipped'
                                ? 'bg-[#1e1b4b] text-[#a5b4fc] border border-[#6366f1]/40'
                                : ord.status === 'Delivered'
                                ? 'bg-[#14532d] text-[#86efac] border border-[#22c55e]/40'
                                : 'bg-[#450a0a] text-[#fca5a5]'
                            }`}>
                              {ord.status}
                            </span>

                            {ord.courierName && ord.trackingNumber && (
                              <div className="text-[9px] text-[#A09A92] font-mono">
                                {ord.courierName}: {ord.trackingNumber}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* State Machine Transition Action */}
                        <td className="p-3.5 text-right space-y-1.5">
                          {ord.status === 'Paid, Awaiting Confirmation' && (() => {
                            const isExp = ord.reservation_expires_at 
                              ? (() => {
                                  const s = ord.reservation_expires_at;
                                  const iso = s.includes('T') ? (s.endsWith('Z') ? s : s + 'Z') : s.replace(' ', 'T') + 'Z';
                                  const t = new Date(iso).getTime();
                                  return !isNaN(t) && t <= Date.now();
                                })() 
                              : false;
                            const isReleased = (ord.reservation_status === 'released' || ord.reservation_status === 'expired') || isExp;

                            if (isReleased) {
                              return (
                                <div className="flex flex-col gap-1 items-end">
                                  <button
                                    onClick={() => handleConfirmPayment(ord.orderId)}
                                    className="px-2.5 py-1 bg-[#065f46] hover:bg-[#047857] text-[#FAF8F5] text-[10px] font-semibold rounded-xs shadow-sm flex items-center gap-1 cursor-pointer"
                                    title="Verify inventory availability and recover order"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Recover & Confirm</span>
                                  </button>
                                  <button
                                    onClick={() => setRejectionModal({
                                      orderId: ord.orderId,
                                      reason: 'Order reservation expired; payment not verified in bank statement'
                                    })}
                                    className="px-2.5 py-1 bg-[#3a1818] hover:bg-[#5a1818] text-[#fca5a5] text-[10px] font-medium rounded-xs cursor-pointer flex items-center gap-1"
                                    title="Reject payment and release reservation"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject Payment</span>
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5 ml-auto">
                                <button
                                  onClick={() => handleConfirmPayment(ord.orderId)}
                                  className="px-2.5 py-1.5 bg-[#065f46] hover:bg-[#047857] text-[#FAF8F5] text-[10px] font-semibold rounded-xs shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Approve payment and commit inventory reservation"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve Payment</span>
                                </button>
                                <button
                                  onClick={() => setRejectionModal({
                                    orderId: ord.orderId,
                                    reason: 'UTR transaction not found in bank statement'
                                  })}
                                  className="px-2 py-1.5 bg-[#3a1818] hover:bg-[#5a1818] text-[#fca5a5] hover:text-white border border-[#6b2323] text-[10px] font-medium rounded-xs cursor-pointer transition-colors flex items-center gap-1"
                                  title="Reject payment and release reserved stock"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject Payment</span>
                                </button>
                              </div>
                            );
                          })()}

                          {ord.status === 'Payment Confirmed' && (
                            <button
                              onClick={() => handleOpenShipDialog(ord.orderId)}
                              className="px-3 py-1.5 bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] text-[11px] font-semibold rounded-xs shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mark as Shipped</span>
                            </button>
                          )}

                          {ord.status === 'Shipped' && (
                            <button
                              onClick={() => handleMarkDelivered(ord.orderId)}
                              className="px-3 py-1.5 bg-[#166534] hover:bg-[#15803d] text-[#FAF8F5] text-[11px] font-semibold rounded-xs shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Delivered</span>
                            </button>
                          )}

                          {ord.status === 'Delivered' && (
                            <span className="text-[10px] text-[#2e7d32] font-semibold block">
                              ✓ Completed
                            </span>
                          )}

                          {(ord.status === 'Cancelled' || ord.status === 'Refunded') && (
                            <div className="space-y-1">
                              {ord.restocked_at || ord.reservation_status === 'released' ? (
                                <span className="text-[10px] text-[#22c55e] font-medium block">
                                  ✓ Restocked {ord.restocked_at ? new Date(ord.restocked_at).toLocaleTimeString() : ''}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRestockOrder(ord.orderId)}
                                  className="px-2.5 py-1 bg-[#d97706] hover:bg-[#b45309] text-white text-[10px] font-semibold rounded-xs shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                                  title="Release reserved units back to active inventory"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restock Inventory</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[#A09A92]">
                        No orders recorded in Supabase yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS MANAGEMENT (Supabase PostgreSQL & Cloudflare R2 Images) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Garments & Products Catalog</h1>
                <p className="text-xs text-[#A09A92]">
                  Garments grouped by Product ID in Supabase with active inventory variants and Cloudflare R2 assets.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isReleasingExpired}
                  onClick={handleReleaseExpired}
                  className="bg-[#1C1B1A] border border-[#3A3835] hover:border-[#D4AF37] text-[#FAF8F5] px-3.5 py-2 text-xs font-medium rounded-xs flex items-center gap-2 cursor-pointer transition-colors"
                  title="Run scheduled job to release expired stock reservations back to inventory"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-[#D4AF37] ${isReleasingExpired ? 'animate-spin' : ''}`} />
                  <span>Release Expired Reservations</span>
                </button>

                <button
                  onClick={() => handleOpenProductModal()}
                  className="bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Product</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2D2B28] text-[#A09A92] uppercase text-[10px] tracking-wider bg-[#141312]">
                    <th className="p-3.5">Image</th>
                    <th className="p-3.5">Garment & Product ID</th>
                    <th className="p-3.5">Category & Fabric</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Total Stock</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Variants</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2B28] text-[#D1CDC7]">
                  {products.map((p) => {
                    const pKey = String(p.productId || p.product_id || p.id);
                    const isExpanded = expandedProductGroup === pKey;
                    const totalQty = p.totalStock !== undefined 
                      ? Number(p.totalStock) 
                      : (p.variants && p.variants.length > 0 ? p.variants.reduce((acc, v) => acc + (v.quantity || 0), 0) : Number(p.quantity ?? 0));
                    const varList = p.variants && p.variants.length > 0 ? p.variants : [{ id: p.id, size: p.size, length: p.length || '56"', quantity: p.quantity ?? 1 }];

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`hover:bg-[#242220] transition-colors ${isExpanded ? 'bg-[#201e1c]' : ''}`}>
                          <td className="p-3.5">
                            <img 
                              src={p.thumbnail || p.image1 || p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=200&auto=format&fit=crop'} 
                              alt={p.name} 
                              className="w-10 h-12 object-cover rounded-xs border border-[#3A3835]" 
                            />
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-[#FAF8F5] block">{p.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#D4AF37] font-mono font-semibold bg-[#262422] px-1.5 py-0.5 rounded-xs">
                                {pKey}
                              </span>
                              <span className="text-[10px] text-[#888888] font-mono truncate max-w-[140px]">
                                /{p.slug}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="bg-[#262422] text-[#FAF8F5] px-2 py-0.5 rounded-xs text-[10px] font-medium block w-fit">
                              {p.category}
                            </span>
                            <span className="text-[10px] text-[#A09A92] mt-0.5 block">{p.fabric}</span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-[#FAF8F5]">
                              ₹{(p.offerPrice ?? p.price).toLocaleString('en-IN')}
                            </div>
                            {(p.originalPrice ?? p.original_price) && (
                              <div className="text-[10px] text-[#777777] line-through">
                                ₹{(p.originalPrice ?? p.original_price)?.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            {totalQty > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#064e3b] text-[#6ee7b7] border border-[#10b981]/30">
                                {totalQty} in stock
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#450a0a] text-[#fca5a5] border border-[#ef4444]/30">
                                Out of Stock
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-semibold ${p.active !== false ? 'bg-[#14532d] text-[#86efac]' : 'bg-[#27272a] text-[#a1a1aa]'}`}>
                                {p.active !== false ? 'Active' : 'Draft'}
                              </span>
                              {p.featured && (
                                <span className="text-[#D4AF37] text-[10px] font-medium block">
                                  ★ Featured
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => setExpandedProductGroup(isExpanded ? null : pKey)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#262422] hover:bg-[#3D3A36] text-[#D4AF37] border border-[#3D3A36] rounded-xs text-[10px] font-medium cursor-pointer transition-colors"
                              title="Toggle inventory variants list"
                            >
                              <Layers className="w-3 h-3" />
                              <span>{varList.length} Variant{varList.length > 1 ? 's' : ''}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleOpenProductModal(p)}
                              className="p-1.5 bg-[#2A2927] hover:bg-[#8C7853] text-[#FAF8F5] rounded-xs cursor-pointer"
                              title="Edit Garment & Variants"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete garment ${p.name} and all its variants?`)) {
                                  deleteProduct(p.id, true);
                                }
                              }}
                              className="p-1.5 bg-[#3a1818] hover:bg-[#990000] text-[#ff8080] hover:text-white rounded-xs cursor-pointer"
                              title="Delete Garment Group"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* Expander Sub-row: Individual Variant Stock Breakdown */}
                        {isExpanded && (
                          <tr className="bg-[#171615]">
                            <td colSpan={8} className="p-4 border-t border-b border-[#2D2B28]">
                              <div className="bg-[#121212] border border-[#3A3835] p-3 rounded-xs space-y-2">
                                <div className="flex items-center justify-between border-b border-[#2D2B28] pb-2">
                                  <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" />
                                    Active Inventory Variants for {p.name} ({pKey})
                                  </span>
                                  <span className="text-[10px] text-[#A09A92]">
                                    Click "Quick Edit" to adjust available stock quantity
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                                  {varList.map((v, vIdx) => (
                                    <div key={v.id || vIdx} className="bg-[#1C1B1A] border border-[#2D2B28] p-2.5 rounded-xs flex flex-col justify-between space-y-2">
                                      <div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="font-semibold text-[#FAF8F5]">{v.size}</span>
                                          <span className="text-[#A09A92] font-mono">{v.length || '56"'}</span>
                                        </div>
                                        <div className="text-[10px] text-[#888888] font-mono mt-0.5 truncate" title={v.id}>
                                          ID: {v.id || `${pKey}-${v.size}-${v.length}`}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-1 border-t border-[#262422]">
                                        <span className={`text-xs font-mono font-bold ${v.quantity > 0 ? 'text-[#6ee7b7]' : 'text-[#ff8080]'}`}>
                                          {v.quantity} in stock
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setStockEditModal({
                                            id: v.id || p.id,
                                            name: p.name,
                                            size: v.size,
                                            length: v.length,
                                            quantity: v.quantity
                                          })}
                                          className="text-[10px] px-2 py-0.5 bg-[#262422] hover:bg-[#8C7853] text-[#FAF8F5] rounded-xs cursor-pointer font-medium"
                                        >
                                          Quick Edit
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {products.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-[#A09A92]">
                        No products currently in catalog. Click "Create New Product" above to add the first piece!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Promo Codes & Vouchers</h1>
                <p className="text-xs text-[#A09A92]">Manage active percentage and flat amount discount vouchers.</p>
              </div>

              <button
                onClick={() => {
                  setEditingCoupon({});
                  setIsCouponModalOpen(true);
                }}
                className="bg-[#8C7853] text-[#FAF8F5] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Coupon</span>
              </button>
            </div>

            <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2D2B28] text-[#A09A92] uppercase text-[10px] tracking-wider bg-[#141312]">
                    <th className="p-3.5">Coupon Code</th>
                    <th className="p-3.5">Discount Type</th>
                    <th className="p-3.5">Value</th>
                    <th className="p-3.5">Min Spend</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2B28] text-[#D1CDC7]">
                  {coupons.map((c) => (
                    <tr key={c.code} className="hover:bg-[#242220]">
                      <td className="p-3.5 font-mono font-semibold text-[#D4AF37]">{c.code}</td>
                      <td className="p-3.5 uppercase">{c.discountType}</td>
                      <td className="p-3.5 font-semibold text-[#FAF8F5]">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </td>
                      <td className="p-3.5">₹{c.minPurchase.toLocaleString('en-IN')}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${c.active ? 'bg-[#1b5e20] text-[#a5d6a7]' : 'bg-[#424242] text-[#e0e0e0]'}`}>
                          {c.active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => deleteCoupon(c.code)}
                          className="p-1.5 bg-[#3a1818] hover:bg-[#990000] text-[#ff8080] hover:text-white rounded-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Client Reviews Moderation</h1>
                <p className="text-xs text-[#A09A92]">Approve or hide customer reviews from public display.</p>
              </div>
            </div>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-[#1C1B1A] border border-[#2D2B28] p-8 text-center text-xs text-[#A09A92]">
                  No client reviews submitted yet.
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="bg-[#1C1B1A] border border-[#2D2B28] p-4 rounded-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#FAF8F5]">{r.customerName}</strong>
                        <span className="text-[#D4AF37]">{'★'.repeat(r.rating)}</span>
                      </div>
                      <p className="text-xs text-[#A09A92] mt-1">{r.reviewText}</p>
                    </div>
                    <button
                      onClick={() => toggleReviewApproval(r.id, !r.approved)}
                      className={`px-3 py-1.5 text-xs rounded-xs font-semibold ${
                        r.approved ? 'bg-[#1b5e20] text-[#a5d6a7]' : 'bg-[#3A3835] text-white'
                      }`}
                    >
                      {r.approved ? 'Approved (Visible)' : 'Approve Review'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS (Supabase & Cloudflare R2 Backend Configuration) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="font-serif text-3xl font-medium text-[#FAF8F5]">Supabase Backend Configuration</h1>
              <p className="text-xs text-[#A09A92] mt-1">
                LaClassé operates on Supabase PostgreSQL, Supabase Edge Functions, and Cloudflare R2 object storage.
              </p>
            </div>

            {settingsSavedMsg && (
              <div className="p-3 bg-[#1b5e20] text-[#a5d6a7] text-xs rounded-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Supabase connection settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-4 text-xs">
              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Supabase Project URL</label>
                <input
                  type="url"
                  value={settingsSupabaseUrl}
                  onChange={(e) => setSettingsSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                />
                <span className="text-[10px] text-[#777777] mt-1 block">
                  Found in Supabase Dashboard → Project Settings → API → Project URL.
                </span>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Supabase Publishable / Anon Key</label>
                <input
                  type="password"
                  value={settingsAnonKey}
                  onChange={(e) => setSettingsAnonKey(e.target.value)}
                  placeholder="sb_publishable_... or anon JWT"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                />
                <span className="text-[10px] text-[#777777] mt-1 block">
                  Found in Supabase Dashboard → Project Settings → API → Project API Keys → anon / public.
                </span>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Cloudflare R2 Public Delivery URL</label>
                <input
                  type="url"
                  value={settingsR2Url}
                  onChange={(e) => setSettingsR2Url(e.target.value)}
                  placeholder="https://pub-de5214d2b1044125bc4e13a67637a92c.r2.dev"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                />
                <span className="text-[10px] text-[#777777] mt-1 block">
                  Public R2 bucket domain or custom domain (e.g. <code className="text-[#D4AF37]">https://pub-de5214d2b1044125bc4e13a67637a92c.r2.dev</code>).
                </span>
              </div>

              <button
                type="submit"
                className="bg-[#8C7853] hover:bg-[#A08B63] text-white px-5 py-2.5 rounded-xs font-semibold uppercase tracking-wider text-xs cursor-pointer"
              >
                Save Backend Settings
              </button>
            </form>

            <div className="bg-[#1C1B1A] border border-[#2D2B28] p-6 rounded-xs space-y-3 text-xs">
              <strong className="text-[#D4AF37] block font-semibold">Cloudflare R2 Object Storage:</strong>
              <p className="text-[#A09A92]">
                Product images and media assets continue to be securely stored in Cloudflare R2 and served via your configured CDN domain, managed via the <code className="text-[#FAF8F5]">r2-images</code> Supabase Edge Function.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[#A09A92]">
                <li>Product images: <code className="text-[#FAF8F5]">laclasse/products/&lt;productId&gt;/img-&lt;slot&gt;-&lt;timestamp&gt;.&lt;ext&gt;</code></li>
                <li>MIME types accepted: JPEG, PNG, WebP (max 10MB per asset)</li>
              </ul>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: VIEW PAYMENT SCREENSHOT PROOF */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs p-6 max-w-lg w-full space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2D2B28] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="font-serif text-lg font-medium text-[#FAF8F5]">Customer Payment Proof</h3>
              </div>
              <button onClick={() => setViewingProofUrl(null)} className="text-[#A09A92] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex items-center justify-center bg-black/50 p-2 rounded-xs">
              <img 
                src={viewingProofUrl} 
                alt="Payment Proof Screenshot" 
                className="max-h-[60vh] max-w-full object-contain rounded-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={viewingProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <span>Open Original Image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setViewingProofUrl(null)}
                className="px-4 py-2 bg-[#262422] hover:bg-[#3D3A36] text-white text-xs rounded-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MARK AS SHIPPED DIALOG */}
      {shippingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#2D2B28] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#8C7853]" />
                <h3 className="font-serif text-lg font-medium text-[#FAF8F5]">Dispatch & Courier Details</h3>
              </div>
              <button onClick={() => setShippingOrderId(null)} className="text-[#A09A92] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitShipDialog} className="space-y-4 text-xs">
              <div>
                <span className="text-[#A09A92] block mb-1">Order Reference</span>
                <strong className="text-sm font-mono text-[#FAF8F5]">{shippingOrderId}</strong>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Courier Partner *</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. BlueDart Express, DTDC, DHL, Delhivery"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Tracking Number / AWB *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BD82739174IN"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingOrderId(null)}
                  className="flex-1 bg-[#262422] text-[#A09A92] py-2.5 rounded-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isShippingUpdating}
                  className="flex-1 bg-[#8C7853] hover:bg-[#A08B63] text-white py-2.5 font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isShippingUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Dispatch</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT ORDER PAYMENT DIALOG */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] rounded-xs p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#2D2B28] pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#ef4444]" />
                <h3 className="font-serif text-lg font-medium text-[#FAF8F5]">Reject Order Payment</h3>
              </div>
              <button onClick={() => setRejectionModal(null)} className="text-[#A09A92] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-4 text-xs">
              <div>
                <span className="text-[#A09A92] block mb-1">Order Reference</span>
                <strong className="text-sm font-mono text-[#FAF8F5]">{rejectionModal.orderId}</strong>
                <p className="text-[10px] text-[#A09A92] mt-0.5">
                  Rejecting payment marks the order as Payment Rejected and immediately restores reserved catalog units.
                </p>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1.5 font-medium">Common Rejection Reasons:</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    'UTR transaction not found in bank statement',
                    'Incorrect payment amount transferred',
                    'Duplicate / invalid transaction reference',
                    'Reservation expired before receipt'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionModal(prev => prev ? ({ ...prev, reason: preset }) : null)}
                      className={`text-[10px] px-2 py-1 rounded-xs border cursor-pointer transition-colors ${
                        rejectionModal.reason === preset
                          ? 'border-[#ef4444] bg-[#2d1212] text-[#fca5a5]'
                          : 'border-[#3A3835] bg-[#121212] text-[#A09A92] hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <label className="block text-[#A09A92] mb-1 font-medium">Detailed Reason / Note to Record *</label>
                <textarea
                  rows={3}
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal(prev => prev ? ({ ...prev, reason: e.target.value }) : null)}
                  placeholder="Explain why the transaction is being rejected..."
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModal(null)}
                  className="flex-1 bg-[#262422] text-[#A09A92] py-2.5 rounded-xs cursor-pointer hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingRejection}
                  className="flex-1 bg-[#7f1d1d] hover:bg-[#991b1b] text-white py-2.5 font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isSubmittingRejection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Reject & Release Stock</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PRODUCT (WITH UP TO 3 R2 IMAGE UPLOADS & VARIANT MANAGEMENT) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] text-[#FAF8F5] rounded-xs p-6 max-w-2xl w-full my-auto space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#2D2B28] pb-3">
              <div>
                <h3 className="font-serif text-xl font-medium">
                  {editingProduct?.id ? 'Edit Garment & Variants (Supabase + R2)' : 'Add New Garment (Supabase + R2)'}
                </h3>
                <span className="text-[10px] text-[#A09A92]">
                  Manage shared garment metadata, Cloudflare R2 assets, and inventory variants.
                </span>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="text-[#A09A92] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Product Name *</label>
                  <input
                    type="text"
                    value={editingProduct?.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Noir Royal Sovereign Silk Abaya"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Product ID / Code *</label>
                  <input
                    type="text"
                    value={editingProduct?.productId || editingProduct?.product_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, productId: e.target.value, product_id: e.target.value })}
                    placeholder="e.g. LC001"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Slug (URL Path)</label>
                  <input
                    type="text"
                    value={editingProduct?.slug || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                    placeholder="e.g. noir-royal-silk-abaya"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Category *</label>
                  <input
                    type="text"
                    value={editingProduct?.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    placeholder="e.g. Luxury, Bridal, Premium, Casual"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Fabric Type *</label>
                  <input
                    type="text"
                    value={editingProduct?.fabric || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, fabric: e.target.value as any })}
                    placeholder="e.g. Dubai Nida, Indonesian Zoom"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Selling Price (INR) *</label>
                  <input
                    type="number"
                    value={editingProduct?.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    placeholder="14999"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Original / Strikethrough Price (INR)</label>
                  <input
                    type="number"
                    value={editingProduct?.originalPrice ?? editingProduct?.original_price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: parseFloat(e.target.value), original_price: parseFloat(e.target.value) })}
                    placeholder="17999"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1 font-medium">Badge / Ribbon (Optional)</label>
                  <input
                    type="text"
                    value={(editingProduct as any)?.badge || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value } as any)}
                    placeholder="e.g. Exclusive, Bestseller, Limited"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct?.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Bespoke craftsmanship details, embellishments, cut..."
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                />
              </div>

              {/* 3 INDEPENDENT IMAGE FIELDS (image1, image2, image3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[#A09A92] font-medium">
                    Product Images (Cloudflare R2 Bucket: image1, image2, image3)
                  </label>
                  <span className="text-[10px] text-[#A09A92]">Reused across all variants of this garment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const preview = productImagePreviews[idx];
                    const slotTitle = idx === 0 ? 'image1 (Primary Thumbnail)' : idx === 1 ? 'image2 (Lookbook Angle)' : 'image3 (Fabric Detail)';
                    return (
                      <div key={idx} className="bg-[#121212] border border-[#3A3835] p-3 rounded-xs space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-[#D4AF37] uppercase">{slotTitle}</span>
                            {preview && (
                              <button
                                type="button"
                                onClick={() => handleRemoveImageSlot(idx)}
                                className="text-[10px] text-[#ff8080] hover:text-white flex items-center gap-0.5 cursor-pointer"
                                title="Remove image"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          {preview ? (
                            <div className="relative group rounded-xs overflow-hidden h-28 bg-[#1C1B1A] flex items-center justify-center border border-[#2D2B28]">
                              <img
                                src={preview}
                                alt={`Slot ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-28 bg-[#181716] border border-dashed border-[#3A3835] rounded-xs flex flex-col items-center justify-center text-[#666666] gap-1">
                              <ImageIcon className="w-6 h-6 text-[#555555]" />
                              <span className="text-[10px]">No image assigned</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="w-full bg-[#262422] hover:bg-[#3D3A36] text-[#FAF8F5] border border-[#3D3A36] text-[10px] py-1.5 px-2 rounded-xs flex items-center justify-center gap-1.5 cursor-pointer font-medium transition-colors">
                            <Upload className="w-3 h-3 text-[#D4AF37]" />
                            <span>{preview ? 'Replace Image' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              onChange={(e) => handleProductImageSelect(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VARIANT STOCK MANAGEMENT (Size, Length, Stock) */}
              <div className="bg-[#121212] border border-[#3A3835] p-3 rounded-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#FAF8F5] block">Inventory Variants for Garment</span>
                    <span className="text-[10px] text-[#A09A92]">Configure sizes, lengths, and quantities for this piece.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVariants(prev => [
                        ...prev,
                        { size: 'Free Size', length: '56"', quantity: 1 }
                      ]);
                    }}
                    className="text-[10px] bg-[#262422] hover:bg-[#3D3A36] text-[#D4AF37] border border-[#3D3A36] px-2.5 py-1 rounded-xs flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {editingVariants.map((v, vIdx) => (
                    <div key={vIdx} className="grid grid-cols-12 gap-2 items-center bg-[#1A1918] p-2 rounded-xs border border-[#2D2B28]">
                      <div className="col-span-4">
                        <label className="text-[9px] text-[#A09A92] block mb-0.5">Size</label>
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => {
                            const updated = [...editingVariants];
                            updated[vIdx] = { ...updated[vIdx], size: e.target.value };
                            setEditingVariants(updated);
                          }}
                          placeholder="e.g. Free Size, XXL, L"
                          className="w-full bg-[#121212] border border-[#3A3835] px-2 py-1 rounded-xs text-[#FAF8F5] text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] text-[#A09A92] block mb-0.5">Length</label>
                        <input
                          type="text"
                          value={v.length}
                          onChange={(e) => {
                            const updated = [...editingVariants];
                            updated[vIdx] = { ...updated[vIdx], length: e.target.value };
                            setEditingVariants(updated);
                          }}
                          placeholder="e.g. 56&quot;"
                          className="w-full bg-[#121212] border border-[#3A3835] px-2 py-1 rounded-xs text-[#FAF8F5] text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[9px] text-[#A09A92] block mb-0.5">Quantity</label>
                        <input
                          type="number"
                          min="0"
                          value={v.quantity}
                          onChange={(e) => {
                            const updated = [...editingVariants];
                            updated[vIdx] = { ...updated[vIdx], quantity: Math.max(0, parseInt(e.target.value, 10) || 0) };
                            setEditingVariants(updated);
                          }}
                          className="w-full bg-[#121212] border border-[#3A3835] px-2 py-1 rounded-xs text-[#FAF8F5] text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-1 text-right pt-3">
                        {editingVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVariants(editingVariants.filter((_, idx) => idx !== vIdx));
                            }}
                            className="text-[#ff8080] hover:text-white p-1 cursor-pointer"
                            title="Remove variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHECKBOXES: isNewArrival, isFeatured, isActive */}
              <div className="flex flex-wrap gap-4 pt-1 border-t border-[#2D2B28]">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editingProduct?.featured || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked, is_featured: e.target.checked ? 1 : 0 } as any)}
                    className="accent-[#8C7853]"
                  />
                  <span>Featured Collection Piece</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editingProduct?.newArrival !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, newArrival: e.target.checked, is_new_arrival: e.target.checked ? 1 : 0 } as any)}
                    className="accent-[#8C7853]"
                  />
                  <span>New Arrival Flag</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editingProduct?.active !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked, is_active: e.target.checked ? 1 : 0 } as any)}
                    className="accent-[#8C7853]"
                  />
                  <span>Active in Storefront</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] py-3 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSavingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Garment & Syncing R2 Assets...</span>
                  </>
                ) : (
                  <span>Save Garment & All Variants</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK EDIT VARIANT STOCK */}
      {stockEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] text-[#FAF8F5] rounded-xs p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-[#2D2B28] pb-3">
              <div>
                <h3 className="font-serif text-lg font-medium text-[#FAF8F5]">Quick Stock Update</h3>
                <span className="text-[10px] text-[#A09A92]">{stockEditModal.name}</span>
              </div>
              <button onClick={() => setStockEditModal(null)} className="text-[#A09A92] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs">
              <div className="bg-[#121212] p-3 rounded-xs border border-[#3A3835] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A09A92]">Variant:</span>
                  <span className="font-semibold text-[#D4AF37]">{stockEditModal.size} {stockEditModal.length ? `• ${stockEditModal.length}` : ''}</span>
                </div>
                <div className="text-[10px] text-[#777777] font-mono">
                  ID: {stockEditModal.id}
                </div>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1 font-medium">Available Units in Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={stockEditModal.quantity}
                  onChange={(e) => setStockEditModal({ ...stockEditModal, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] font-mono text-base font-bold focus:outline-none focus:border-[#D4AF37]"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStockEditModal(null)}
                  className="flex-1 bg-[#262422] text-[#A09A92] py-2 rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStock}
                  className="flex-1 bg-[#8C7853] hover:bg-[#A08B63] text-white py-2 font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Stock</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT COUPON */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1B1A] border border-[#2D2B28] text-[#FAF8F5] rounded-xs p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-[#2D2B28] pb-3">
              <h3 className="font-serif text-xl font-medium">Create Promo Coupon</h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-[#A09A92]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCouponForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A09A92] mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={editingCoupon?.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value })}
                  placeholder="e.g. EID2026"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5] uppercase font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A09A92] mb-1">Type</label>
                  <select
                    value={editingCoupon?.discountType || 'percentage'}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as any })}
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A09A92] mb-1">Discount Value *</label>
                  <input
                    type="number"
                    value={editingCoupon?.discountValue || ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: parseFloat(e.target.value) })}
                    placeholder="15 or 1000"
                    className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A09A92] mb-1">Minimum Spend (INR)</label>
                <input
                  type="number"
                  value={editingCoupon?.minPurchase || 0}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, minPurchase: parseFloat(e.target.value) })}
                  placeholder="5000"
                  className="w-full bg-[#121212] border border-[#3A3835] px-3 py-2 rounded-xs text-[#FAF8F5]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] py-3 text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer"
              >
                Save Coupon
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
