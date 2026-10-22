import React, { useState } from 'react';
import { Mail, Lock, Globe, Key, X, AlertCircle, Loader2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { getSupabaseUrl, getSupabaseAnonKey } from '../../utils/supabase';
import logo from '../../assets/SVG-02 (12)-Photoroom.png';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onLoginSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [supabaseUrl, setSupabaseUrlInput] = useState(() => getSupabaseUrl() || '');
  const [supabaseAnonKey, setSupabaseAnonKeyInput] = useState(() => getSupabaseAnonKey() || '');
  const [showConfig, setShowConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginAdmin } = useAdmin();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await loginAdmin(email, password, supabaseUrl, supabaseAnonKey);
      if (res.success) {
        if (typeof onSuccess === 'function') onSuccess();
        if (typeof onLoginSuccess === 'function') onLoginSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Invalid credentials or inactive administrator role.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/85 backdrop-blur-md">
      <div
        className="bg-[#1C1B1A] border border-[#2D2B28] text-[#FAF8F5] rounded-xs shadow-2xl w-full max-w-md p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A09A92] hover:text-[#FAF8F5]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-6">
          <div className="flex justify-center mb-2">
            <img src={logo} alt="LA.CLASSÈ" className="h-12 w-auto object-contain brightness-0 invert" />
          </div>
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-medium block">
              Atelier Privé Management
            </span>
            <h3 className="font-serif text-xl font-medium text-[#FAF8F5]">
              Supabase Admin Portal
            </h3>
          </div>
          <p className="text-xs text-[#A09A92]">
            Sign in with your verified administrator credentials to manage haute couture orders, inventory, and R2 assets.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#3a1818] border border-[#6b2323] text-[#ff8080] text-xs rounded-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#A09A92] mb-1 font-medium">
              Administrator Email *
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@laclasse.com"
                className="w-full bg-[#121212] border border-[#3A3835] text-[#FAF8F5] px-4 py-2.5 pl-9 text-xs rounded-xs focus:outline-none focus:border-[#D4AF37]"
                autoFocus
                disabled={isSubmitting}
                required
              />
              <Mail className="w-4 h-4 text-[#8C7853] absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#A09A92] mb-1 font-medium">
              Password *
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#121212] border border-[#3A3835] text-[#FAF8F5] px-4 py-2.5 pl-9 text-xs rounded-xs focus:outline-none focus:border-[#D4AF37]"
                disabled={isSubmitting}
                required
              />
              <Lock className="w-4 h-4 text-[#8C7853] absolute left-3 top-3" />
            </div>
          </div>

          {/* Collapsible Supabase Project Connection Details */}
          <div className="pt-2 border-t border-[#2D2B28]">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-between w-full text-[11px] text-[#A09A92] hover:text-[#D4AF37] transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5" />
                <span>Supabase Project Settings</span>
              </span>
              {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConfig && (
              <div className="mt-3 space-y-3 bg-[#161514] p-3 rounded-xs border border-[#2D2B28]">
                <div>
                  <label className="block text-[10px] text-[#A09A92] mb-1 uppercase tracking-wider">
                    Supabase Project URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrlInput(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full bg-[#121212] border border-[#3A3835] text-[#FAF8F5] px-3 py-2 text-[11px] rounded-xs focus:outline-none focus:border-[#D4AF37]"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#A09A92] mb-1 uppercase tracking-wider">
                    Publishable / Anon API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      className="w-full bg-[#121212] border border-[#3A3835] text-[#FAF8F5] px-3 py-2 text-[11px] rounded-xs focus:outline-none focus:border-[#D4AF37]"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#8C7853] hover:bg-[#A08B63] text-[#FAF8F5] py-3 text-xs font-medium uppercase tracking-[0.2em] rounded-xs transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Supabase...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticate & Access Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[10px] text-[#777777]">
          Secured with Supabase Auth, PostgreSQL Row Level Security (RLS), and Cloudflare R2.
        </div>
      </div>
    </div>
  );
};
