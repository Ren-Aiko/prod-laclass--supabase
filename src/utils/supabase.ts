/**
 * =====================================================================
 * Supabase Client Configuration & Utilities
 * Connects to Supabase PostgreSQL database and Edge Functions
 * =====================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default production credentials provided for LaClassé project
const DEFAULT_SUPABASE_URL = 'https://sfqnaftcpuoyftpjgxbb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_x1k-8OB-6e4rCuYLuwUjNw_ylVYmLL3';

// Resolve Supabase URL from environment, localStorage, or provided default
export const getSupabaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const localSaved = localStorage.getItem('laclasse_supabase_url');
  if (localSaved && localSaved.trim() !== '') {
    return localSaved.trim().replace(/\/+$/, '');
  }
  return DEFAULT_SUPABASE_URL;
};

export const setSupabaseUrl = (url: string) => {
  if (url) {
    localStorage.setItem('laclasse_supabase_url', url.trim());
  } else {
    localStorage.removeItem('laclasse_supabase_url');
  }
};

// Resolve Supabase Publishable / Anon Key from environment, localStorage, or provided default
export const getSupabaseAnonKey = (): string => {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim() !== '') {
    return envKey.trim();
  }
  const localSaved = localStorage.getItem('laclasse_supabase_anon_key');
  if (localSaved && localSaved.trim() !== '') {
    return localSaved.trim();
  }
  return DEFAULT_SUPABASE_KEY;
};

export const setSupabaseAnonKey = (key: string) => {
  if (key) {
    localStorage.setItem('laclasse_supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('laclasse_supabase_anon_key');
  }
};

// Default Cloudflare R2 Public URL provided for LaClassé project
const DEFAULT_R2_PUBLIC_URL = 'https://pub-de5214d2b1044125bc4e13a67637a92c.r2.dev';

// Resolve Cloudflare R2 Public URL from environment, localStorage, or provided default
export const getR2PublicUrl = (): string => {
  const envUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const localSaved = localStorage.getItem('laclasse_r2_public_url');
  if (localSaved && localSaved.trim() !== '') {
    return localSaved.trim().replace(/\/+$/, '');
  }
  return DEFAULT_R2_PUBLIC_URL;
};

export const setR2PublicUrl = (url: string) => {
  if (url) {
    localStorage.setItem('laclasse_r2_public_url', url.trim());
  } else {
    localStorage.removeItem('laclasse_r2_public_url');
  }
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key);
};

// Singleton Supabase Client instance
let supabaseClientInstance: SupabaseClient | null = null;
let currentClientConfig = { url: '', key: '' };

export const getSupabase = (): SupabaseClient => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or via the Admin Portal.'
    );
  }

  if (!supabaseClientInstance || currentClientConfig.url !== url || currentClientConfig.key !== key) {
    supabaseClientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'laclasse_supabase_auth_token',
      },
    });
    currentClientConfig = { url, key };
  }

  return supabaseClientInstance;
};

/**
 * Invoke a Supabase Edge Function with CORS and authorization headers
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase project URL and publishable key must be configured.');
  }

  const endpointUrl = `${url}/functions/v1/${functionName}`;
  const headers = new Headers(options.headers || {});

  headers.set('apikey', key);

  // If Supabase session exists, include user's access token
  try {
    const client = getSupabase();
    const { data: { session } } = await client.auth.getSession();
    if (session?.access_token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch {}

  // If no auth token yet, provide anon key in Bearer for public Edge Functions
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${key}`);
  }

  let requestBody = options.body;
  if (requestBody && !(requestBody instanceof FormData) && typeof requestBody === 'object') {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(requestBody);
  }

  const response = await fetch(endpointUrl, {
    method: options.method || 'POST',
    headers,
    body: requestBody,
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const err = await response.json();
      throw new Error(err.error || `Edge Function error: HTTP ${response.status}`);
    }
    const rawText = await response.text();
    throw new Error(`Edge Function error (HTTP ${response.status}): ${rawText.slice(0, 100)}`);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text() as unknown as T;
}
