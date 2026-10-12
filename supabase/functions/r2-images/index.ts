// =====================================================================
// Function: r2-images
// Path: /supabase/functions/r2-images/index.ts
// Methods: POST, DELETE
// Standalone file — Ready to paste directly into Supabase Dashboard Web Editor
// =====================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.540.0';

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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = getServiceClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw new Error('Invalid or expired authentication session');
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('id, auth_user_id, email, role, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single();

  if (adminError || !adminRecord) {
    throw new Error('Access denied: User is not an active administrator');
  }

  return { user, admin: adminRecord };
}

function getR2Client(): S3Client {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) in Edge Function environment.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function resolvePublicUrl(key: string): string {
  const publicBase = (Deno.env.get('R2_PUBLIC_URL') || 'https://pub-de5214d2b1044125bc4e13a67637a92c.r2.dev').replace(/\/+$/, '');
  if (publicBase) {
    return `${publicBase}/${key.replace(/^\/+/, '')}`;
  }
  return key;
}

function getExtension(mimeType: string, filename = ''): string {
  if (filename) {
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext || '')) {
        return ext === 'jpeg' ? 'jpg' : (ext || 'jpg');
      }
    }
  }
  switch (mimeType) {
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    default: return 'jpg';
  }
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
    const r2 = getR2Client();
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'laclasse-assets';

    // POST: Upload image to Cloudflare R2
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return errorResponse('Content-Type must be multipart/form-data', 400);
      }

      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const productId = String(formData.get('product_id') || 'garment').trim();
      const slot = String(formData.get('slot') || '1').trim();

      if (!file || !(file instanceof File)) {
        return errorResponse('No file provided in form-data payload.', 400);
      }

      // MIME validation (JPEG, PNG, WebP)
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      if (!allowedMimes.includes(file.type)) {
        return errorResponse(`Invalid file type (${file.type}). Only JPEG, PNG, WebP, and AVIF are permitted.`, 400);
      }

      // Max size: 10MB
      const MAX_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        return errorResponse('File size exceeds the 10MB limit.', 400);
      }

      const ext = getExtension(file.type, file.name);
      const safeProductId = productId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const timestamp = Date.now();
      const randomNonce = Math.floor(1000 + Math.random() * 9000);
      const key = `laclasse/products/${safeProductId}/img-${slot}-${timestamp}-${randomNonce}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      await r2.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: uint8,
        ContentType: file.type,
      }));

      const publicUrl = resolvePublicUrl(key);

      return jsonResponse({
        success: true,
        key,
        url: publicUrl,
        slot,
        product_id: productId,
        size_bytes: file.size,
      }, 201);
    }

    // DELETE: Remove image from Cloudflare R2
    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const urlOrKey = String(body.url || body.key || '').trim();

      if (!urlOrKey) {
        return errorResponse('URL or key is required for deletion.', 400);
      }

      let key = urlOrKey;
      if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
        try {
          const parsed = new URL(urlOrKey);
          key = parsed.pathname.replace(/^\/+/, '');
        } catch {
          key = urlOrKey;
        }
      }

      // Prevent directory traversal or deleting non-laclasse paths
      if (!key.startsWith('laclasse/')) {
        return errorResponse('Cannot delete files outside the laclasse namespace.', 403);
      }

      await r2.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));

      return jsonResponse({
        success: true,
        deleted_key: key,
      });
    }

    return errorResponse('Method Not Allowed. Use POST or DELETE.', 405);
  } catch (err: any) {
    console.error('[r2-images Exception]:', err);
    return errorResponse(err.message || 'Error processing R2 storage operation', 500);
  }
});
