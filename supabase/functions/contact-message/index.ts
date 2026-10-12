// =====================================================================
// Function: contact-message
// Path: /supabase/functions/contact-message/index.ts
// Method: POST
// Standalone file — Ready to paste directly into Supabase Dashboard Web Editor
// =====================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getServiceClient() {
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

  return createClient(supabaseUrl, secretKey || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 405);
  }

  try {
    const supabase = getServiceClient();
    const body = await req.json().catch(() => ({}));

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!name || name.length < 2) {
      return errorResponse('Please provide your name.', 400);
    }
    if (!email || !message || message.length < 5) {
      return errorResponse('Email address and a message (minimum 5 characters) are required.', 400);
    }

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        name,
        email,
        phone: phone || null,
        message,
        status: 'Unread',
      });

    if (insertError) {
      console.error('[contact-message Insert Error]:', insertError);
      return errorResponse(insertError.message || 'Error transmitting your message.', 400, insertError);
    }

    return jsonResponse({
      success: true,
      message: 'Your inquiry has been received. Our concierge atelier will get back to you shortly.',
    }, 201);
  } catch (err: any) {
    console.error('[contact-message Exception]:', err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
});
