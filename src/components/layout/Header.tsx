import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Heart, Menu, X, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import logo from '../../assets/SVG-02 (12)-Photoroom.png';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentPage,
  onNavigate,
  onOpenSearch
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
    { id: 'reviews', label: 'Client Reviews' },
    { id: 'about', label: 'Brand Story' },
    { id: 'order-status', label: 'Order Status' },
    { id: 'contact', label: 'Contact' }
  ];
  const leftNavLinks = navLinks.slice(0, 3);
  const rightNavLinks = navLinks.slice(3);

  const renderNavLink = (link: typeof navLinks[number]) => (
    <button
      key={link.id}
      onClick={() => {
        handleTabChange(link.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className={`text-xs font-medium uppercase tracking-[0.15em] transition-colors relative py-1 whitespace-nowrap ${
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
  );

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FCFCFC]/90 backdrop-blur-md shadow-sm border-b border-[#EAEAEA] py-1.5'
          : 'bg-[#FCFCFC] border-b border-[#ECECEC] py-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center min-h-[48px] md:min-h-[56px]">
          
          {/* Desktop & Mobile Left Section */}
          <div className="flex items-center min-w-0">
            {/* Mobile Menu Toggle */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-[#121212] hover:text-[#B55232] transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Desktop Left Navigation Links */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
              {leftNavLinks.map(renderNavLink)}
            </nav>
          </div>

          {/* Brand Logo */}
          <div className="justify-self-center text-center py-0 z-10 px-2">
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
                className="h-12 sm:h-14 md:h-16 lg:h-20 w-auto object-contain scale-[1.75]"
              />
            </button>
          </div>

          {/* Desktop Right Navigation and Store Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 lg:gap-4 min-w-0">
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
              {rightNavLinks.map(renderNavLink)}
            </nav>
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#121212] hover:text-[#B55232] transition-colors"
              title="Search products"
              aria-label="Search catalog"
            >
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#121212] hover:text-[#B55232] transition-colors flex items-center gap-1.5"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {totalItemCount > 0 && (
                <span className="w-4 h-4 bg-[#121212] text-[#FCFCFC] rounded-full text-[9px] font-semibold flex items-center justify-center">
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="w-4/5 max-w-sm bg-[#FCFCFC] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
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
                  className="p-1 text-[#121212] hover:text-[#B55232]"
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
                    className={`text-left text-sm uppercase tracking-[0.2em] py-2 border-b border-[#F2F2F2] flex items-center justify-between ${
                      currentTab === link.id
                        ? 'text-[#121212] font-semibold'
                        : 'text-[#666666]'
                    }`}
                  >
                    <span>{link.label}</span>
                    <Sparkles className="w-3 h-3 text-[#B55232] opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#EAEAEA]">
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
