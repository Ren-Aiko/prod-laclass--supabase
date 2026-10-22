import React, { useState, useEffect } from 'react';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';

import { CartDrawer } from './components/Cart/CartDrawer';
import { QuickViewModal } from './components/ui/QuickViewModal';
import { SizeGuideModal } from './components/ui/SizeGuideModal';
import { SearchModal } from './components/ui/SearchModal';
import { CheckoutModal } from './components/Checkout/CheckoutModal';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';

import { HomePage } from './pages/Home';
import { ShopPage } from './pages/Shop';
import { ProductDetailPage } from './pages/ProductDetail';
import { AboutPage } from './pages/About';
import { ReviewsPage } from './pages/ReviewsPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { ShippingReturnsPage } from './pages/ShippingReturnsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsConditionsPage } from './pages/TermsConditionsPage';

import { Product, CategoryType } from './types';
import { useStore } from './context/StoreContext';
import { useAdmin } from './context/AdminContext';
import { fetchProductBySlug } from './services/products';

export function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const { products, setSelectedCategory, setIsSearchOpen } = useStore();
  const { isAdminAuthenticated } = useAdmin();

  // Dynamic Route Resolver based on window.location.pathname
  const resolveRouteFromPath = async () => {
    const path = window.location.pathname;

    if (path.startsWith('/product/')) {
      const slug = decodeURIComponent(path.replace('/product/', '').replace(/\/+$/, ''));
      if (slug) {
        setCurrentSlug(slug);
        setCurrentPage('product-detail');

        // Look up in existing store products first
        const matched = products.find(p => p.slug === slug || p.id === slug || p.productId === slug);
        if (matched) {
          setSelectedProduct(matched);
        } else {
          // Fetch from worker API
          const fetched = await fetchProductBySlug(slug);
          if (fetched) {
            setSelectedProduct(fetched);
          }
        }
        return;
      }
    }

    if (path === '/shop') {
      setCurrentPage('shop');
      return;
    }
    if (path === '/admin') {
      setCurrentPage('admin');
      return;
    }
    if (path === '/about') {
      setCurrentPage('about');
      return;
    }
    if (path === '/reviews') {
      setCurrentPage('reviews');
      return;
    }
    if (path === '/contact') {
      setCurrentPage('contact');
      return;
    }
    if (path === '/shipping-returns') {
      setCurrentPage('shipping-returns');
      return;
    }
    if (path === '/privacy-policy') {
      setCurrentPage('privacy-policy');
      return;
    }
    if (path === '/terms-conditions') {
      setCurrentPage('terms-conditions');
      return;
    }

    setCurrentPage('home');
  };

  useEffect(() => {
    resolveRouteFromPath();

    const handlePopState = () => {
      resolveRouteFromPath();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update selected product if products load later while viewing /product/:slug
  useEffect(() => {
    if (currentPage === 'product-detail' && currentSlug && !selectedProduct && products.length > 0) {
      const matched = products.find(p => p.slug === currentSlug || p.id === currentSlug || p.productId === currentSlug);
      if (matched) {
        setSelectedProduct(matched);
      }
    }
  }, [products, currentPage, currentSlug, selectedProduct]);

  const handleNavigateCategory = (cat: CategoryType) => {
    setSelectedCategory(cat);
    setCurrentPage('shop');
    window.history.pushState({}, '', '/shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentSlug(product.slug || product.id);
    setCurrentPage('product-detail');
    const slugUrl = `/product/${product.slug || product.id}`;
    window.history.pushState({}, '', slugUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigatePage = (page: string) => {
    if (page === 'admin' && !isAdminAuthenticated) {
      setIsAdminLoginOpen(true);
      return;
    }
    if (page === 'collections') {
      setSelectedCategory('All');
      setCurrentPage('shop');
      window.history.pushState({}, '', '/shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page === 'faq') {
      setCurrentPage('home');
      window.history.pushState({}, '', '/');
      setTimeout(() => {
        document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    setCurrentPage(page);
    const targetUrl = page === 'home' ? '/' : `/${page}`;
    window.history.pushState({}, '', targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-[#121212] font-sans antialiased flex flex-col justify-between selection:bg-[#8C7853] selection:text-white">
      
      {/* Top Banner & Navigation Header */}
      <div>
        <AnnouncementBar />
        <Header
          currentPage={currentPage}
          onNavigate={handleNavigatePage}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAdminModal={() => setIsAdminLoginOpen(true)}
        />

        {/* Dynamic Page Router Content */}
        <div>
          {currentPage === 'home' && (
            <HomePage
              onSelectCategory={handleNavigateCategory}
              onSelectProduct={handleSelectProduct}
              onNavigateShop={() => handleNavigatePage('shop')}
            />
          )}

          {currentPage === 'shop' && (
            <ShopPage
              onSelectProduct={handleSelectProduct}
            />
          )}

          {currentPage === 'product-detail' && (
            <ProductDetailPage
              product={selectedProduct || products[0]}
              onBack={() => handleNavigatePage('shop')}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {currentPage === 'about' && (
            <AboutPage
              onExploreShop={() => handleNavigatePage('shop')}
            />
          )}

          {currentPage === 'reviews' && (
            <ReviewsPage />
          )}

          {currentPage === 'contact' && (
            <ContactPage />
          )}

          {currentPage === 'shipping-returns' && (
            <ShippingReturnsPage />
          )}

          {currentPage === 'privacy-policy' && (
            <PrivacyPolicyPage />
          )}

          {currentPage === 'terms-conditions' && (
            <TermsConditionsPage />
          )}

          {currentPage === 'admin' && (
            <AdminPage onNavigate={handleNavigatePage} />
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigatePage}
        onSelectCategory={handleNavigateCategory}
      />

      {/* Persistent Modals & Drawers */}
      <CartDrawer 
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onOpenCheckout={() => setIsCheckoutOpen(true)} 
      />
      <QuickViewModal onSelectProduct={handleSelectProduct} />
      <SizeGuideModal />
      <SearchModal onSelectProduct={handleSelectProduct} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <AdminLoginModal 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)} 
        onSuccess={() => setCurrentPage('admin')}
        onLoginSuccess={() => setCurrentPage('admin')} 
      />

      {/* Floating Concierge WhatsApp */}
      <FloatingWhatsApp />

    </div>
  );
}
export default App;
