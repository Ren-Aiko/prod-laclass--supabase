import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Heart, Menu, X, Shield, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import logo from '../../assets/SVG-02 (12)-Photoroom.png';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onOpenSearch?: () => void;
  onOpenAdminModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentPage,
  onNavigate,
  onOpenSearch,
  onOpenAdminModal
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { totalItemCount, setIsCartOpen } = useCart();
  const { wishlist } = useStore();

  const currentTab = currentPage || activeTab || 'home';

  const handleTabChange = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'collections', label: 'Collections' },
    { id: 'about', label: 'Brand Story' },
    { id: 'reviews', label: 'Client Reviews' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FCFCFA]/90 backdrop-blur-md shadow-sm border-b border-[#EAEAEA] py-3'
          : 'bg-[#FCFCFA] border-b border-[#F0ECE1] py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between min-h-[56px] md:min-h-[64px]">
          
          {/* Desktop & Mobile Left Section */}
          <div className="flex items-center space-x-6 xl:space-x-8 pr-8 lg:pr-12 xl:pr-16">
            {/* Mobile Menu Toggle */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-[#121212] hover:text-[#8C7853] transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Desktop Left Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    handleTabChange(link.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-xs font-medium uppercase tracking-[0.2em] transition-colors relative py-1 ${
                    currentTab === link.id
                      ? 'text-[#121212] font-semibold'
                      : 'text-[#555555] hover:text-[#121212]'
                  }`}
                >
                  {link.label}
                  {currentTab === link.id && (
                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#121212] transition-all duration-300" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Brand Logo - Dead Centered Horizontally with Generous Spacing */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center py-1 z-10 px-6 sm:px-10 md:px-12">
            <button
              onClick={() => {
                handleTabChange('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex flex-col items-center focus:outline-none transition-transform duration-300 hover:scale-105"
              aria-label="LaClassé Home"
            >
              <img
                src={logo}
                alt="LA.CLASSÈ"
                className="h-25 sm:h-40 md:h-[90px] lg:h-[140px] w-auto object-contain"
              />
            </button>
          </div>

          {/* Right Action Buttons: Search, Cart, Admin */}
          <div className="flex items-center space-x-3 sm:space-x-5 z-20 pl-8 lg:pl-12 xl:pl-16">
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#121212] hover:text-[#8C7853] transition-colors"
              title="Search products"
              aria-label="Search catalog"
            >
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#121212] hover:text-[#8C7853] transition-colors flex items-center gap-1.5"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {totalItemCount > 0 && (
                <span className="w-4 h-4 bg-[#121212] text-[#FCFCFA] rounded-full text-[9px] font-semibold flex items-center justify-center">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Admin Dashboard Quick Portal */}
            <button
              onClick={onOpenAdminModal}
              className="hidden sm:flex items-center gap-1 text-[10px] tracking-widest uppercase border border-[#D1CDC7] px-2.5 py-1 rounded-sm text-[#555555] hover:text-[#121212] hover:border-[#121212] transition-colors"
              title="Admin Portal"
            >
              <Shield className="w-3 h-3 text-[#8C7853]" />
              <span>Admin</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="w-4/5 max-w-sm bg-[#FCFCFA] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4 mb-6">
                <button
                  onClick={() => {
                    handleTabChange('home');
                    setIsMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left focus:outline-none"
                >
                  <img
                    src={logo}
                    alt="LA.CLASSÈ"
                    className="h-12 sm:h-14 w-auto object-contain"
                  />
                </button>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-[#121212] hover:text-[#8C7853]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      handleTabChange(link.id);
                      setIsMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`text-left text-sm uppercase tracking-[0.2em] py-2 border-b border-[#F5F2EA] flex items-center justify-between ${
                      currentTab === link.id
                        ? 'text-[#121212] font-semibold'
                        : 'text-[#666666]'
                    }`}
                  >
                    <span>{link.label}</span>
                    <Sparkles className="w-3 h-3 text-[#8C7853] opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#EAEAEA] space-y-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAdminModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#121212] text-[#FCFCFA] text-xs uppercase tracking-[0.2em] font-medium rounded-sm"
              >
                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Admin Portal</span>
              </button>

              <div className="text-center text-[10px] text-[#888888] tracking-widest uppercase">
                Crafted with Dubai & Indonesian Fine Fabrics
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
