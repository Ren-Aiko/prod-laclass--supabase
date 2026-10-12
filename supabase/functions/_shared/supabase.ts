// =====================================================================
// _shared/supabase.ts
// Shared Supabase client provider for Edge Functions
// Reads injected SUPABASE_URL, modern SUPABASE_SECRET_KEYS, and legacy keys
// =====================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sfqnaftcpuoyftpjgxbb.supabase.co';

  let secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!secretKey && Deno.env.get('SUPABASE_SECRET_KEYS')) {
    try {
      const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!);
      secretKey = keys['default'] || Object.values(keys)[0] as string;
    } catch {}
  }

  if (!secretKey) {
    secretKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  }

  if (!supabaseUrl || !secretKey) {
    throw new Error('Supabase URL or Secret Key not available in Edge Function runtime.');
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
