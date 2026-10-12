/**
 * Backend Configuration & Status
 * Reports live Supabase PostgreSQL & Cloudflare R2 connection state
 */
import { getSupabaseUrl, getSupabaseAnonKey, getR2PublicUrl, isSupabaseConfigured } from '../utils/supabase';

export const getDatabaseStatus = (): {
  configured: boolean;
  provider: string;
  supabaseUrl: string;
  hasAnonKey: boolean;
  r2PublicUrl: string;
} => {
  const supabaseUrl = getSupabaseUrl();
  const hasAnonKey = Boolean(getSupabaseAnonKey());
  const r2PublicUrl = getR2PublicUrl();
  const configured = isSupabaseConfigured();

  return {
    configured,
    provider: 'Supabase PostgreSQL + Edge Functions & Cloudflare R2',
    supabaseUrl: supabaseUrl || 'Not Configured (set VITE_SUPABASE_URL)',
    hasAnonKey,
    r2PublicUrl,
  };
};
