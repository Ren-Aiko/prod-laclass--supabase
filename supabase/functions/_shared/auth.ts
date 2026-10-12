// =====================================================================
// _shared/auth.ts
// Server-Side Administrator Authentication & Role Verification
// Supports modern SUPABASE_SECRET_KEYS and legacy SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sfqnaftcpuoyftpjgxbb.supabase.co';

  // Read secret service role key (modern or legacy)
  let secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!secretKey && Deno.env.get('SUPABASE_SECRET_KEYS')) {
    try {
      const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!);
      secretKey = keys['default'] || Object.values(keys)[0] as string;
    } catch {}
  }

  // Fallback to custom secret if user configured CUSTOM_SERVICE_ROLE_KEY
  if (!secretKey) {
    secretKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  }

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Missing Supabase credentials in Edge Function environment. Ensure SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS is available.'
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validates the caller's JWT Bearer token and ensures they exist as an
 * active administrator in the `admins` metadata table.
 */
export async function requireAdmin(req: Request): Promise<{ user: any; admin: AdminUser }> {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = getAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw new Error('Invalid or expired authentication session');
  }

  // Check `admins` table
  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('id, auth_user_id, email, role, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single();

  if (adminError || !adminRecord) {
    throw new Error('Access denied: User is not an active administrator');
  }

  return { user, admin: adminRecord as AdminUser };
}
