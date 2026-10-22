// =====================================================================
// src/services/client.ts
// Supabase Client for Edge Runtime, Next.js, and Vite SPA environments
// =====================================================================

import { createClient } from '@supabase/supabase-js';

// Resolve Supabase URL from environment (Next.js, Vite, or default)
const resolveSupabaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
    return (import.meta.env.VITE_SUPABASE_URL as string).trim();
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('laclasse_supabase_url');
    if (saved && saved.trim()) return saved.trim();
  }
  return 'https://sfqnaftcpuoyftpjgxbb.supabase.co';
};

// Resolve Supabase Anon/Publishable Key from environment
const resolveSupabaseAnonKey = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim();
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('laclasse_supabase_anon_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return 'sb_publishable_x1k-8OB-6e4rCuYLuwUjNw_ylVYmLL3';
};

const supabaseUrl = resolveSupabaseUrl();
const supabaseAnonKey = resolveSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
