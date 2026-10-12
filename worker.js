/**
 * =====================================================================
 * Cloudflare Worker for LaClassé Haute Couture
 * Standalone REST API for Cloudflare D1 (SQLite) and Cloudflare R2
 * =====================================================================
 * 
 * Bindings:
 *  - env.DB           (D1 Database binding)
 *  - env.BUCKET       (R2 Bucket binding)
 *  - env.ADMIN_SECRET (Secret string for Bearer token auth, default: 'laclasse-secret-2026')
 *  - env.RESERVATION_EXPIRY_MINUTES (Stock reservation expiry in minutes, default: 30)
 *  - env.R2_PUBLIC_URL (Optional public custom domain or CDN URL for R2 bucket)
 */

// Helper: Standard CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Helper: JSON response with CORS
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

// Helper: Validate Admin Authentication
function verifyAdmin(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  const secret = (env && env.ADMIN_SECRET) ? env.ADMIN_SECRET : 'laclasse-secret-2026';
  return token === secret;
}

// Helper: Automatic Slug Generator
export function generateSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper: Normalize size name
function normalizeSize(size) {
  const s = String(size || '').trim();
  if (s.toUpperCase() === '2XL' || s.toUpperCase() === 'XXL') return 'XXL';
  if (s.toLowerCase() === 'free size' || s.toLowerCase() === 'freesize') return 'Free Size';
  return s;
}

// Helper: Normalize length name (ensure quotes e.g. 56 or 56" -> 56")
function normalizeLength(len) {
  if (!len) return null;
  const str = String(len).trim();
  if (str.endsWith('"')) return str;
  return `${str}"`;
}

// Helper: Resolve public URL for an R2 key
function resolveAssetUrl(request, env, key) {
  if (env && env.R2_PUBLIC_URL) {
    const base = env.R2_PUBLIC_URL.replace(/\/+$/, '');
    return `${base}/${key}`;
  }
  const url = new URL(request.url);
  return `${url.origin}/api/media/${encodeURIComponent(key)}`;
}

// Helper: Extract file extension from MIME type or filename
function getExtension(mimeType, filename = '') {
  if (filename) {
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = parts.pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  }
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    case 'image/gif': return 'gif';
    default: return 'jpg';
  }
}

// Fallback high-res placeholder image
const SAFE_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop';

// =====================================================================
// CORE DOMAIN LOGIC: Release Expired Reservations (Atomic & Idempotent)
// =====================================================================
export async function releaseExpiredReservations(env) {
  if (!env || !env.DB) {
    return { releasedCount: 0, orderIds: [] };
  }

  // Find orders where reservation has expired, status is 'reserved', and not confirmed/shipped
  const { results: expiredOrders } = await env.DB.prepare(
    `SELECT id, items, reservation_status, payment_status, reservation_expires_at, notes 
     FROM orders 
     WHERE reservation_status = 'reserved' 
       AND reservation_expires_at IS NOT NULL 
       AND (reservation_expires_at <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now') OR reservation_expires_at <= datetime('now'))
       AND payment_status NOT IN ('Payment Confirmed', 'Shipped', 'Delivered')`
  ).all();

  if (!expiredOrders || expiredOrders.length === 0) {
    return { releasedCount: 0, orderIds: [] };
  }

  const releasedOrderIds = [];

  for (const ord of expiredOrders) {
    // Atomic state transition: Only update if still 'reserved'
    // This serializes with any concurrent admin payment confirmation
    const updateRes = await env.DB.prepare(
      `UPDATE orders SET 
        reservation_status = 'released',
        payment_status = 'Cancelled',
        notes = CASE 
          WHEN notes IS NULL OR notes = '' THEN '[Reservation expired: stock restored]' 
          ELSE notes || ' [Reservation expired: stock restored]' 
        END,
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ? AND reservation_status = 'reserved'`
    ).bind(ord.id).run();

    const changes = updateRes?.meta?.changes ?? (updateRes?.success ? 1 : 0);
    if (changes > 0) {
      releasedOrderIds.push(ord.id);

      // Restore standard variant inventory exactly once
      // Fetch relational items or parse JSON
      const { results: orderItems } = await env.DB.prepare(
        `SELECT id, product_id, product_variant_id, quantity, size, length 
         FROM order_items 
         WHERE order_id = ?`
      ).bind(ord.id).all();

      let itemsToRestore = orderItems || [];

      // Fallback to JSON items if order_items rows are empty
      if (itemsToRestore.length === 0 && ord.items) {
        try {
          const parsed = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
          if (Array.isArray(parsed)) {
            itemsToRestore = parsed.map(i => ({
              product_id: i.product_id || i.productId,
              product_variant_id: i.product_variant_id || i.id,
              quantity: i.quantity,
              size: i.size,
              length: i.length
            }));
          }
        } catch {}
      }

      for (const item of itemsToRestore) {
        const itemSize = normalizeSize(item.size);
        // Never restock Custom items
        if (itemSize !== 'Custom') {
          const qty = Math.max(1, Number(item.quantity || 1));
          if (item.product_variant_id) {
            await env.DB.prepare(
              `UPDATE products SET 
                quantity = quantity + ?, 
                updated_at = datetime('now') 
               WHERE id = ?`
            ).bind(qty, item.product_variant_id).run();
          } else {
            const pId = item.product_id;
            const len = normalizeLength(item.length);
            let restockSql = `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE product_id = ? AND size = ?`;
            const params = [qty, pId, itemSize];
            if (len) {
              restockSql += ` AND (length = ? OR length IS NULL)`;
              params.push(len);
            }
            await env.DB.prepare(restockSql).bind(...params).run();
          }
        }
      }
    }
  }

  return { releasedCount: releasedOrderIds.length, orderIds: releasedOrderIds };
}

// =====================================================================
// EXPORT WORKER DEFINITION (Fetch & Scheduled Handlers)
// =====================================================================
export default {
  // -------------------------------------------------------------------
  // Scheduled Cron Task Handler (e.g. crons = ["*/5 * * * *"])
  // -------------------------------------------------------------------
  async scheduled(controller, env, ctx) {
    try {
      const result = await releaseExpiredReservations(env);
      console.log(`[Worker Scheduled Cron]: Checked expired reservations. Released ${result.releasedCount} orders:`, result.orderIds);
    } catch (err) {
      console.error('[Worker Scheduled Cron Error]:', err);
    }
  },

  // -------------------------------------------------------------------
  // Fetch Request Handler
  // -------------------------------------------------------------------
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // -------------------------------------------------------------
      // ROUTE: GET /api/health
      // -------------------------------------------------------------
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          status: 'online',
          d1: Boolean(env.DB),
          r2: Boolean(env.BUCKET),
          reservationExpiryMinutes: Number(env.RESERVATION_EXPIRY_MINUTES || 30),
          timestamp: new Date().toISOString()
        });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/media/* (Serve R2 assets directly)
      // -------------------------------------------------------------
      if (path.startsWith('/api/media/') && method === 'GET') {
        const key = decodeURIComponent(path.replace('/api/media/', ''));
        if (!env.BUCKET) {
          // If no R2 bucket, redirect to safe placeholder
          return Response.redirect(SAFE_PLACEHOLDER_IMAGE, 302);
        }
        const object = await env.BUCKET.get(key);
        if (!object) {
          return new Response('Asset Not Found', { status: 404, headers: corsHeaders });
        }
        const headers = new Headers(corsHeaders);
        if (typeof object.writeHttpMetadata === 'function') {
          object.writeHttpMetadata(headers);
        } else if (object.httpMetadata) {
          if (object.httpMetadata.contentType) headers.set('Content-Type', object.httpMetadata.contentType);
        }
        if (object.httpEtag) headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(object.body, { headers });
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/admin/media/upload (R2 image upload)
      // Authenticated admin route
      // Validates format (JPEG, PNG, WebP) and size (max 10MB)
      // Generates unique unpredictable object key
      // -------------------------------------------------------------
      if (path === '/api/admin/media/upload' && method === 'POST') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.BUCKET) {
          return jsonResponse({ error: 'R2 bucket binding missing (env.BUCKET)' }, 500);
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const productId = (formData.get('product_id') || formData.get('productId') || 'shared').toString().trim();
        const slot = (formData.get('slot') || '1').toString().trim();

        if (!file || typeof file === 'string' || !(file instanceof Blob || file.size > 0)) {
          return jsonResponse({ error: 'Valid image file is required.' }, 400);
        }

        // Validate file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          return jsonResponse({ error: 'Image exceeds maximum allowed size of 10MB.' }, 400);
        }

        // Validate format
        const mimeType = (file.type || '').toLowerCase();
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(mimeType)) {
          return jsonResponse({ 
            error: `Invalid file format '${mimeType || 'unknown'}'. Only JPEG, PNG, and WebP are accepted.` 
          }, 400);
        }

        const ext = getExtension(mimeType, file.name || '');
        // Generate unique unpredictable key
        const randomToken = crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const r2Key = `laclasse/products/${productId.toLowerCase()}/img-${slot}-${Date.now()}-${randomToken}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType: mimeType || 'image/jpeg' },
          customMetadata: {
            productId,
            slot,
            uploadedAt: new Date().toISOString()
          }
        });

        const publicUrl = resolveAssetUrl(request, env, r2Key);
        return jsonResponse({
          success: true,
          key: r2Key,
          url: publicUrl,
          size: file.size,
          contentType: mimeType
        }, 201);
      }

      // -------------------------------------------------------------
      // ROUTE: DELETE /api/admin/media (Safe R2 deletion)
      // Authenticated admin route
      // Checks that no other record references the asset before deleting
      // -------------------------------------------------------------
      if (path === '/api/admin/media' && method === 'DELETE') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.BUCKET) {
          return jsonResponse({ error: 'R2 bucket binding missing (env.BUCKET)' }, 500);
        }

        const body = await request.json().catch(() => ({}));
        const keyOrUrl = body.key || body.url || url.searchParams.get('key') || url.searchParams.get('url');

        if (!keyOrUrl) {
          return jsonResponse({ error: 'R2 object key or url required.' }, 400);
        }

        // Extract key from URL if full URL passed
        let r2Key = keyOrUrl;
        if (keyOrUrl.includes('/api/media/')) {
          r2Key = decodeURIComponent(keyOrUrl.split('/api/media/')[1]);
        }

        // Safe reference check in D1: Ensure no other active product references this key/url
        if (env.DB) {
          const { results: refs } = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM products 
             WHERE image1 = ? OR image2 = ? OR image3 = ? OR thumbnail = ? 
                OR image1 LIKE ? OR image2 LIKE ? OR image3 LIKE ?`
          ).bind(r2Key, r2Key, r2Key, r2Key, `%${r2Key}%`, `%${r2Key}%`, `%${r2Key}%`).all();

          const count = Number(refs?.[0]?.count || 0);
          if (count > 0) {
            return jsonResponse({
              success: false,
              retained: true,
              message: `Asset '${r2Key}' is still referenced by ${count} product variant(s). Kept in R2 for referential integrity.`
            }, 200);
          }
        }

        await env.BUCKET.delete(r2Key);
        return jsonResponse({ success: true, message: `R2 object '${r2Key}' safely deleted.` });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/categories
      // -------------------------------------------------------------
      if (path === '/api/categories' && method === 'GET') {
        if (!env.DB) {
          return jsonResponse(['All', 'Premium', 'Bridal', 'Casual', 'Luxury']);
        }
        const { results } = await env.DB.prepare(
          "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != '' AND is_active = 1 ORDER BY category ASC"
        ).all();

        const categories = (results || [])
          .map((r) => r.category && r.category.trim())
          .filter(Boolean);

        return jsonResponse(categories.length > 0 ? ['All', ...categories] : ['All', 'Premium', 'Bridal', 'Casual', 'Luxury']);
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/products
      // Groups rows by product_id so that 1 garment with 5 lengths appears as 1 card!
      // Aggregate real active inventory variants: LC001 to LC009
      // -------------------------------------------------------------
      if (path === '/api/products' && method === 'GET') {
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const slugQuery = url.searchParams.get('slug');
        const isRaw = url.searchParams.get('raw') === 'true';

        let sql = 'SELECT * FROM products WHERE is_active = 1';
        let params = [];

        if (slugQuery) {
          sql += ' AND (slug = ? OR product_id = ?)';
          params.push(slugQuery, slugQuery);
        }

        sql += ' ORDER BY is_featured DESC, created_at ASC';

        const stmt = params.length > 0 ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
        const { results } = await stmt.all();
        const rows = results || [];

        if (isRaw) {
          return jsonResponse(rows);
        }

        // Group rows strictly by product_id (or slug if missing)
        const groupedMap = new Map();

        for (const row of rows) {
          const groupKey = row.product_id || row.slug || row.id;
          const normalizedSize = normalizeSize(row.size);
          const normalizedLen = normalizeLength(row.length);
          const variantQty = Math.max(0, Number(row.quantity ?? 0));

          if (!groupedMap.has(groupKey)) {
            const primaryImage = row.image1 || row.thumbnail || SAFE_PLACEHOLDER_IMAGE;
            const allImages = [row.image1, row.image2, row.image3].filter(Boolean);
            if (allImages.length === 0) allImages.push(primaryImage);

            groupedMap.set(groupKey, {
              id: row.id,
              product_id: row.product_id || groupKey,
              productId: row.product_id || groupKey,
              productCode: row.product_id || groupKey,
              product_code: row.product_id || groupKey,
              name: row.name,
              slug: row.slug || generateSlug(row.name),
              category: row.category,
              collection: row.collection || `${row.category} Signature`,
              description: row.description,
              detailedFabric: row.detailed_fabric || (row.fabric ? `Crafted from fine ${row.fabric}.` : 'Fine fabric.'),
              detailed_fabric: row.detailed_fabric,
              fabric: row.fabric,
              price: row.price,
              originalPrice: row.original_price ?? null,
              original_price: row.original_price ?? null,
              offerPrice: row.original_price ?? null,
              offer_price: row.original_price ?? null,
              featured: Boolean(row.is_featured),
              is_featured: Boolean(row.is_featured),
              newArrival: Boolean(row.is_new_arrival ?? 1),
              is_new_arrival: Boolean(row.is_new_arrival ?? 1),
              flashSale: Boolean(row.is_flash_sale),
              is_flash_sale: Boolean(row.is_flash_sale),
              active: true,
              is_active: 1,
              careInstructions: row.care_instructions || 'Dry clean recommended or gentle cold hand wash.',
              care_instructions: row.care_instructions,
              includesMatchingSheila: row.includes_matching_sheila !== undefined ? Boolean(row.includes_matching_sheila) : true,
              includes_matching_sheila: row.includes_matching_sheila !== undefined ? Boolean(row.includes_matching_sheila) : true,
              image1: row.image1 || primaryImage,
              image2: row.image2 || null,
              image3: row.image3 || null,
              images: allImages,
              thumbnail: primaryImage,
              rating: row.rating || 5.0,
              reviewCount: row.review_count || 0,
              review_count: row.review_count || 0,
              createdAt: row.created_at,
              created_at: row.created_at,
              variants: [],
              sizes: [],
              lengths: [],
              sizeStock: {},
              variantStock: {},
              totalStock: 0,
            });
          }

          const group = groupedMap.get(groupKey);

          // Add variant record
          group.variants.push({
            id: row.id,
            size: normalizedSize,
            length: normalizedLen,
            quantity: variantQty,
            price: row.price
          });

          // Track sizes that actually exist in active variants
          if (!group.sizes.includes(normalizedSize)) {
            group.sizes.push(normalizedSize);
          }

          // Track lengths that actually exist
          if (normalizedLen && !group.lengths.includes(normalizedLen)) {
            group.lengths.push(normalizedLen);
          }

          // Aggregate stock counts
          group.sizeStock[normalizedSize] = (group.sizeStock[normalizedSize] || 0) + variantQty;
          if (normalizedLen) {
            group.variantStock[`${normalizedSize}_${normalizedLen}`] = variantQty;
          }
          group.variantStock[row.id] = variantQty;
          group.totalStock += variantQty;
        }

        // Append 'Custom' as an available bespoke size configuration for all products
        for (const group of groupedMap.values()) {
          if (!group.sizes.includes('Custom')) {
            group.sizes.push('Custom');
          }
          group.sizeStock['Custom'] = 9999;
          group.quantity = group.totalStock;
          group.stock = group.totalStock;

          // Ensure default length is first available length
          if (group.lengths.length > 0) {
            group.length = group.lengths[0];
          } else {
            group.lengths = ['56"'];
            group.length = '56"';
          }
        }

        const products = Array.from(groupedMap.values());
        return jsonResponse(products);
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/products/:slug
      // -------------------------------------------------------------
      if (path.startsWith('/api/products/') && method === 'GET') {
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const slugOrId = decodeURIComponent(path.replace('/api/products/', ''));
        const { results } = await env.DB.prepare(
          'SELECT * FROM products WHERE (slug = ? OR product_id = ? OR id = ?) AND is_active = 1 ORDER BY created_at ASC'
        ).bind(slugOrId, slugOrId, slugOrId).all();

        if (!results || results.length === 0) {
          return jsonResponse({ error: `Product '${slugOrId}' not found` }, 404);
        }

        const rows = results;
        const first = rows[0];
        const primaryImage = first.image1 || first.thumbnail || SAFE_PLACEHOLDER_IMAGE;
        const allImages = [first.image1, first.image2, first.image3].filter(Boolean);
        if (allImages.length === 0) allImages.push(primaryImage);

        const variants = [];
        const sizes = [];
        const lengths = [];
        const sizeStock = {};
        const variantStock = {};
        let totalStock = 0;

        for (const r of rows) {
          const normSize = normalizeSize(r.size);
          const normLen = normalizeLength(r.length);
          const qty = Math.max(0, Number(r.quantity ?? 0));

          variants.push({
            id: r.id,
            size: normSize,
            length: normLen,
            quantity: qty,
            price: r.price
          });

          if (!sizes.includes(normSize)) sizes.push(normSize);
          if (normLen && !lengths.includes(normLen)) lengths.push(normLen);

          sizeStock[normSize] = (sizeStock[normSize] || 0) + qty;
          if (normLen) {
            variantStock[`${normSize}_${normLen}`] = qty;
          }
          variantStock[r.id] = qty;
          totalStock += qty;
        }

        if (!sizes.includes('Custom')) sizes.push('Custom');
        sizeStock['Custom'] = 9999;

        const product = {
          id: first.id,
          product_id: first.product_id || first.id,
          productId: first.product_id || first.id,
          productCode: first.product_id || first.id,
          product_code: first.product_id || first.id,
          name: first.name,
          slug: first.slug || generateSlug(first.name),
          category: first.category,
          collection: first.collection || `${first.category} Signature`,
          description: first.description,
          detailedFabric: first.detailed_fabric || (first.fabric ? `Crafted from fine ${first.fabric}.` : 'Fine fabric.'),
          detailed_fabric: first.detailed_fabric,
          fabric: first.fabric,
          price: first.price,
          originalPrice: first.original_price ?? null,
          original_price: first.original_price ?? null,
          offerPrice: first.original_price ?? null,
          offer_price: first.original_price ?? null,
          featured: Boolean(first.is_featured),
          is_featured: Boolean(first.is_featured),
          newArrival: Boolean(first.is_new_arrival ?? 1),
          is_new_arrival: Boolean(first.is_new_arrival ?? 1),
          flashSale: Boolean(first.is_flash_sale),
          is_flash_sale: Boolean(first.is_flash_sale),
          active: true,
          is_active: 1,
          careInstructions: first.care_instructions || 'Dry clean recommended or gentle cold hand wash.',
          care_instructions: first.care_instructions,
          includesMatchingSheila: first.includes_matching_sheila !== undefined ? Boolean(first.includes_matching_sheila) : true,
          includes_matching_sheila: first.includes_matching_sheila !== undefined ? Boolean(first.includes_matching_sheila) : true,
          image1: first.image1 || primaryImage,
          image2: first.image2 || null,
          image3: first.image3 || null,
          images: allImages,
          thumbnail: primaryImage,
          variants,
          sizes,
          lengths: lengths.length > 0 ? lengths : ['56"'],
          length: lengths.length > 0 ? lengths[0] : '56"',
          sizeStock,
          variantStock,
          totalStock,
          quantity: totalStock,
          stock: totalStock,
          rating: first.rating || 5.0,
          reviewCount: first.review_count || 0,
          review_count: first.review_count || 0,
          createdAt: first.created_at,
          created_at: first.created_at,
        };

        return jsonResponse(product);
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/orders (Checkout & Atomic Stock Reservation)
      // Recalculates prices, discounts, shipping fees server-side.
      // Validates custom measurements if Custom.
      // Validates stock and reserves atomically using conditional updates.
      // Rolls back on any failure.
      // Sets reservation_expires_at to UTC now + 30 min.
      // Sets reservation_status = 'reserved'.
      // -------------------------------------------------------------
      if (path === '/api/orders' && method === 'POST') {
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const body = await request.json().catch(() => ({}));

        const cust = body.customer || {};
        const customerName = (body.customer_name || body.customerName || cust.fullName || cust.name || '').trim();
        const email = (body.customer_email || body.email || cust.email || '').trim();
        const phone = (body.customer_phone || body.phone || cust.phone || '').trim();
        const address = (body.shipping_address || body.address || cust.address || '').trim();
        const utrNumber = (body.utr_number || body.utrNumber || '').trim().replace(/\s+/g, '');
        const items = Array.isArray(body.items) ? body.items : [];
        const couponCode = (body.coupon_code || body.couponCode || '').trim().toUpperCase();
        const notes = body.notes || cust.notes || '';

        if (!customerName || !email || !phone || !address) {
          return jsonResponse({ error: 'Customer name, email, phone, and shipping address are required.' }, 400);
        }

        if (!utrNumber || utrNumber.length < 6) {
          return jsonResponse({
            error: 'A valid 12-digit UPI Ref / UTR / Transaction reference number is required to confirm your payment.'
          }, 400);
        }

        if (items.length === 0) {
          return jsonResponse({ error: 'Order must contain at least one item.' }, 400);
        }

        // =============================================================
        // 1. Server-side Item Validation & Stock Check
        // =============================================================
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        for (const itm of items) {
          const pId = itm.product_id || itm.productId || itm.id;
          const reqSize = normalizeSize(itm.size || 'M');
          const reqLen = normalizeLength(itm.length);
          const reqQty = Math.max(1, parseInt(itm.quantity || 1, 10));

          if (!pId) {
            return jsonResponse({ error: 'Invalid product reference in cart item.' }, 400);
          }

          // Case A: Custom Measurement Order
          if (reqSize === 'Custom') {
            const rawM = itm.custom_measurements || itm.customMeasurements;
            if (!rawM || typeof rawM !== 'object') {
              return jsonResponse({ 
                error: 'Bespoke custom measurement specifications are missing for custom item.' 
              }, 400);
            }

            // Required numeric fields
            const chest = parseFloat(rawM.chest);
            const hip = parseFloat(rawM.hip);
            const abayaLength = parseFloat(rawM.abayaLength);
            const height = parseFloat(rawM.height);
            const sleeveLength = parseFloat(rawM.sleeveLength);

            if (isNaN(chest) || chest <= 0 ||
                isNaN(hip) || hip <= 0 ||
                isNaN(abayaLength) || abayaLength <= 0 ||
                isNaN(height) || height <= 0 ||
                isNaN(sleeveLength) || sleeveLength <= 0) {
              return jsonResponse({
                error: 'All 5 custom measurements (Chest, Hip, Abaya Length, Height, Sleeve Length) must be valid positive numbers.'
              }, 400);
            }

            // Look up product price from database (never trust client)
            const { results: prodRows } = await env.DB.prepare(
              `SELECT id, product_id, name, price, is_active FROM products WHERE (product_id = ? OR id = ?) AND is_active = 1 LIMIT 1`
            ).bind(pId, pId).all();

            if (!prodRows || prodRows.length === 0) {
              return jsonResponse({ error: `Product '${pId}' is inactive or not found.` }, 400);
            }

            const pRow = prodRows[0];
            const unitPrice = Number(pRow.price);
            calculatedSubtotal += unitPrice * reqQty;

            verifiedItems.push({
              product_id: pRow.product_id || pId,
              product_variant_id: null, // Per spec: NULL for custom order item
              name: pRow.name,
              size: 'Custom',
              length: null, // Per spec: length = NULL for custom
              quantity: reqQty,
              price_at_purchase: unitPrice,
              custom_measurements: JSON.stringify({
                chest: String(chest),
                hip: String(hip),
                abayaLength: String(abayaLength),
                height: String(height),
                sleeveLength: String(sleeveLength)
              })
            });

          } else {
            // Case B: Standard Inventory Variant
            // Find specific matching variant in products table
            let query = `SELECT id, product_id, name, size, length, quantity, price, is_active 
                         FROM products 
                         WHERE (product_id = ? OR id = ?) 
                           AND size = ? 
                           AND is_active = 1`;
            const params = [pId, pId, reqSize];

            if (reqLen) {
              query += ` AND (length = ? OR length IS NULL)`;
              params.push(reqLen);
            }
            query += ` LIMIT 1`;

            const { results: variantRows } = await env.DB.prepare(query).bind(...params).all();

            if (!variantRows || variantRows.length === 0) {
              return jsonResponse({
                error: `Inventory variant not found or inactive for size '${reqSize}'${reqLen ? ` and length '${reqLen}'` : ''}.`
              }, 400);
            }

            const variantRow = variantRows[0];
            const availableStock = Number(variantRow.quantity ?? 0);

            if (availableStock < reqQty) {
              return jsonResponse({
                error: `Insufficient stock for ${variantRow.name} (${reqSize}${reqLen ? `, ${reqLen}` : ''}). Available: ${availableStock}, Requested: ${reqQty}.`
              }, 409);
            }

            const unitPrice = Number(variantRow.price);
            calculatedSubtotal += unitPrice * reqQty;

            verifiedItems.push({
              product_id: variantRow.product_id || pId,
              product_variant_id: variantRow.id,
              name: variantRow.name,
              size: reqSize,
              length: reqLen || variantRow.length || null,
              quantity: reqQty,
              price_at_purchase: unitPrice,
              custom_measurements: null
            });
          }
        }

        // =============================================================
        // 2. Server-side Coupon & Discount Calculation
        // =============================================================
        let discountAmount = 0;
        if (couponCode) {
          const { results: couponRows } = await env.DB.prepare(
            `SELECT code, discount_type, discount_value, min_purchase, expiry_date, active 
             FROM coupons 
             WHERE UPPER(code) = ? AND active = 1 LIMIT 1`
          ).bind(couponCode).all();

          if (couponRows && couponRows.length > 0) {
            const coup = couponRows[0];
            const minSpend = Number(coup.min_purchase || 0);
            if (calculatedSubtotal >= minSpend) {
              if (coup.discount_type === 'percentage') {
                discountAmount = Math.round((calculatedSubtotal * Number(coup.discount_value)) / 100);
              } else {
                discountAmount = Math.min(calculatedSubtotal, Number(coup.discount_value));
              }
            }
          }
        }

        // Complimentary shipping over ₹5000, else ₹250
        const shippingFee = (calculatedSubtotal === 0 || calculatedSubtotal >= 5000) ? 0 : 250;
        const grandTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingFee);

        // =============================================================
        // 3. Atomic Stock Reservation Execution
        // Decrement standard variants using conditional SQL updates
        // If any variant fails (e.g. concurrent race condition), ROLL BACK!
        // =============================================================
        const reservedVariants = []; // To roll back if any subsequent item fails

        for (const item of verifiedItems) {
          if (item.product_variant_id && item.size !== 'Custom') {
            // Conditional update: only succeeds if quantity >= reqQty
            const decResult = await env.DB.prepare(
              `UPDATE products SET 
                quantity = quantity - ?,
                updated_at = datetime('now')
               WHERE id = ? AND quantity >= ?`
            ).bind(item.quantity, item.product_variant_id, item.quantity).run();

            const changes = decResult?.meta?.changes ?? (decResult?.success ? 1 : 0);

            if (changes === 0) {
              // Rollback previously decremented items in this transaction
              for (const prev of reservedVariants) {
                await env.DB.prepare(
                  `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
                ).bind(prev.quantity, prev.variantId).run();
              }

              return jsonResponse({
                error: `Stock reservation failed for '${item.name}' (${item.size}, ${item.length}). The item was just secured by another customer.`
              }, 409);
            }

            reservedVariants.push({
              variantId: item.product_variant_id,
              quantity: item.quantity
            });
          }
        }

        // =============================================================
        // 4. Create Order & Order Items
        // Expiry set to UTC 30 min from now
        // =============================================================
        const expiryMinutes = parseInt(env.RESERVATION_EXPIRY_MINUTES || '30', 10);
        const orderId = body.id || `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const initialStatus = 'Paid, Awaiting Confirmation';
        const reservationStatus = 'reserved';

        try {
          // Insert order
          await env.DB.prepare(
            `INSERT INTO orders (
              id, customer_name, customer_email, customer_phone, shipping_address,
              total_amount, amount, discount_amount, shipping_fee, items,
              utr_number, payment_status, payment_method, reservation_status,
              reservation_expires_at, notes, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, 'UPI_QR_MANUAL', ?,
              strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+${expiryMinutes} minutes'), ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            )`
          ).bind(
            orderId, customerName, email, phone, address,
            grandTotal, calculatedSubtotal, discountAmount, shippingFee, JSON.stringify(verifiedItems),
            utrNumber, initialStatus, reservationStatus, notes
          ).run();

          // Insert order items
          for (const item of verifiedItems) {
            const itemId = `item_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            await env.DB.prepare(
              `INSERT INTO order_items (
                id, order_id, product_id, product_variant_id, quantity, size, length, price_at_purchase, custom_measurements, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
            ).bind(
              itemId,
              orderId,
              item.product_id,
              item.product_variant_id,
              item.quantity,
              item.size,
              item.length,
              item.price_at_purchase,
              item.custom_measurements
            ).run();
          }

        } catch (dbErr) {
          // Rollback reserved stock if order creation failed
          for (const prev of reservedVariants) {
            await env.DB.prepare(
              `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(prev.quantity, prev.variantId).run();
          }
          throw dbErr;
        }

        return jsonResponse({
          success: true,
          id: orderId,
          orderId,
          utr_number: utrNumber,
          payment_status: initialStatus,
          reservation_status: reservationStatus,
          total_amount: grandTotal,
          amount: calculatedSubtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          expires_in_minutes: expiryMinutes,
          message: 'Order created and stock reserved for 30 minutes. The atelier will reconcile your UTR against bank credits.'
        }, 201);
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/admin/orders
      // Authenticated admin view
      // -------------------------------------------------------------
      if (path === '/api/admin/orders' && method === 'GET') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const { results: ordersList } = await env.DB.prepare(
          'SELECT * FROM orders ORDER BY created_at DESC'
        ).all();

        const orders = ordersList || [];

        const enrichedOrders = orders.map((o) => {
          let parsedItems = [];
          if (typeof o.items === 'string') {
            try { parsedItems = JSON.parse(o.items); } catch {}
          } else if (Array.isArray(o.items)) {
            parsedItems = o.items;
          }

          return {
            ...o,
            customer_name: o.customer_name,
            customer_email: o.customer_email || o.email,
            customer_phone: o.customer_phone || o.phone,
            shipping_address: o.shipping_address || o.address,
            total_amount: o.total_amount ?? o.grand_total ?? 0,
            utr_number: o.utr_number || o.utrNumber,
            payment_status: o.payment_status || o.status,
            reservation_status: o.reservation_status || 'reserved',
            reservation_expires_at: o.reservation_expires_at,
            restocked_at: o.restocked_at,
            items: parsedItems,
          };
        });

        return jsonResponse(enrichedOrders);
      }

      // -------------------------------------------------------------
      // ROUTE: PATCH /api/admin/orders/:id
      // State transitions:
      //  - 'Payment Confirmed':
      //     Verify reservation is still valid. If valid, set reservation_status = 'committed'.
      //     If already expired, run controlled recovery process checking current stock.
      //  - 'Shipped':
      //     Requires courier_name and tracking_number.
      //  - 'Cancelled' / 'Refunded':
      //     If unpaid order cancelled, release reservation and restore stock exactly once.
      //     If paid order cancelled/refunded, do not automatically restock (requires explicit restock action).
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/orders/') && method === 'PATCH' && !path.endsWith('/restock')) {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const orderId = decodeURIComponent(path.replace('/api/admin/orders/', ''));
        const body = await request.json();
        const nextStatus = body.payment_status || body.status;

        const validStatuses = [
          'Paid, Awaiting Confirmation',
          'Payment Confirmed',
          'Shipped',
          'Delivered',
          'Cancelled',
          'Refunded'
        ];

        if (!nextStatus || !validStatuses.includes(nextStatus)) {
          return jsonResponse({ error: `Invalid status. Allowed statuses: ${validStatuses.join(', ')}` }, 400);
        }

        const { results: existingRows } = await env.DB.prepare(
          'SELECT * FROM orders WHERE id = ? LIMIT 1'
        ).bind(orderId).all();

        if (!existingRows || existingRows.length === 0) {
          return jsonResponse({ error: `Order ${orderId} not found.` }, 404);
        }

        const currentOrder = existingRows[0];
        const prevStatus = currentOrder.payment_status;
        const currentReservation = currentOrder.reservation_status || 'reserved';

        let courierName = body.courier_name ?? currentOrder.courier_name;
        let trackingNumber = body.tracking_number ?? currentOrder.tracking_number;

        // Enforce courier and tracking for 'Shipped'
        if (nextStatus === 'Shipped') {
          if (!courierName?.trim() || !trackingNumber?.trim()) {
            return jsonResponse({
              error: "Marking an order as 'Shipped' strictly requires both 'courier_name' and 'tracking_number'."
            }, 400);
          }
        }

        let nextReservationStatus = currentReservation;

        // Case 1: Payment Confirmation
        if (nextStatus === 'Payment Confirmed') {
          // If already committed, fine
          if (currentReservation === 'committed') {
            nextReservationStatus = 'committed';
          } else if (currentReservation === 'reserved') {
            // Check if reservation is still active
            const { results: expiryCheck } = await env.DB.prepare(
              `SELECT (datetime('now') <= reservation_expires_at) as is_valid FROM orders WHERE id = ?`
            ).bind(orderId).all();

            const isValid = Boolean(expiryCheck?.[0]?.is_valid);

            if (isValid) {
              nextReservationStatus = 'committed';
            } else {
              // Expired reservation recovery process:
              // Check current stock and attempt re-reservation
              let itemsList = [];
              try { itemsList = JSON.parse(currentOrder.items); } catch {}

              const reReserved = [];
              for (const itm of itemsList) {
                if (itm.product_variant_id && normalizeSize(itm.size) !== 'Custom') {
                  const qty = Math.max(1, Number(itm.quantity || 1));
                  const reRes = await env.DB.prepare(
                    `UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ? AND quantity >= ?`
                  ).bind(qty, itm.product_variant_id, qty).run();

                  const chg = reRes?.meta?.changes ?? (reRes?.success ? 1 : 0);
                  if (chg === 0) {
                    // Rollback any re-reserved
                    for (const rb of reReserved) {
                      await env.DB.prepare(
                        `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
                      ).bind(rb.quantity, rb.variantId).run();
                    }
                    return jsonResponse({
                      error: `Reservation expired and variant '${itm.name}' is out of stock. Cannot confirm payment.`
                    }, 409);
                  }
                  reReserved.push({ variantId: itm.product_variant_id, quantity: qty });
                }
              }
              nextReservationStatus = 'committed';
            }
          } else if (currentReservation === 'released') {
            // Expired/released recovery check
            let itemsList = [];
            try { itemsList = JSON.parse(currentOrder.items); } catch {}

            const reReserved = [];
            for (const itm of itemsList) {
              if (itm.product_variant_id && normalizeSize(itm.size) !== 'Custom') {
                const qty = Math.max(1, Number(itm.quantity || 1));
                const reRes = await env.DB.prepare(
                  `UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ? AND quantity >= ?`
                ).bind(qty, itm.product_variant_id, qty).run();

                const chg = reRes?.meta?.changes ?? (reRes?.success ? 1 : 0);
                if (chg === 0) {
                  for (const rb of reReserved) {
                    await env.DB.prepare(
                      `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(rb.quantity, rb.variantId).run();
                  }
                  return jsonResponse({
                    error: `Reservation was released and variant '${itm.name}' is no longer available in stock. Cannot confirm payment.`
                  }, 409);
                }
                reReserved.push({ variantId: itm.product_variant_id, quantity: qty });
              }
            }
            nextReservationStatus = 'committed';
          }
        }

        // Case 2: Cancellation of unpaid reserved order -> release reservation & restore stock
        if (
          (nextStatus === 'Cancelled' || nextStatus === 'Refunded') &&
          prevStatus !== 'Cancelled' &&
          prevStatus !== 'Refunded'
        ) {
          if (currentReservation === 'reserved') {
            // Unpaid reservation cancelled: release and restock
            nextReservationStatus = 'released';

            let itemsList = [];
            try { itemsList = JSON.parse(currentOrder.items); } catch {}

            for (const itm of itemsList) {
              if (itm.product_variant_id && normalizeSize(itm.size) !== 'Custom') {
                const qty = Math.max(1, Number(itm.quantity || 1));
                await env.DB.prepare(
                  `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
                ).bind(qty, itm.product_variant_id).run();
              }
            }
          }
          // If currentReservation === 'committed' (was paid), do NOT automatically restock!
          // Admin must use explicit restock endpoint per spec G.
        }

        // Update order record
        await env.DB.prepare(
          `UPDATE orders SET 
            payment_status = ?,
            reservation_status = ?,
            courier_name = ?,
            tracking_number = ?,
            updated_at = datetime('now')
           WHERE id = ?`
        ).bind(nextStatus, nextReservationStatus, courierName || null, trackingNumber || null, orderId).run();

        return jsonResponse({
          success: true,
          id: orderId,
          payment_status: nextStatus,
          reservation_status: nextReservationStatus,
          courier_name: courierName,
          tracking_number: trackingNumber,
          updated_at: new Date().toISOString()
        });
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/admin/orders/:id/restock
      // Explicit restock action for cancelled/refunded paid orders
      // Ensures exact-once restocking via restocked_at check
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/restock') && method === 'POST') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const orderId = decodeURIComponent(path.replace('/api/admin/orders/', '').replace('/restock', ''));

        const { results: existingRows } = await env.DB.prepare(
          'SELECT * FROM orders WHERE id = ? LIMIT 1'
        ).bind(orderId).all();

        if (!existingRows || existingRows.length === 0) {
          return jsonResponse({ error: `Order ${orderId} not found.` }, 404);
        }

        const ord = existingRows[0];

        if (ord.restocked_at) {
          return jsonResponse({ 
            error: `Order ${orderId} was already restocked at ${ord.restocked_at}. Duplicate restock prevented.` 
          }, 400);
        }

        if (ord.payment_status !== 'Cancelled' && ord.payment_status !== 'Refunded') {
          return jsonResponse({ 
            error: `Explicit restock is only permitted for Cancelled or Refunded orders. Current status: ${ord.payment_status}.` 
          }, 400);
        }

        let itemsList = [];
        try { itemsList = JSON.parse(ord.items); } catch {}

        let restoredCount = 0;
        for (const itm of itemsList) {
          if (itm.product_variant_id && normalizeSize(itm.size) !== 'Custom') {
            const qty = Math.max(1, Number(itm.quantity || 1));
            await env.DB.prepare(
              `UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(qty, itm.product_variant_id).run();
            restoredCount += qty;
          }
        }

        await env.DB.prepare(
          `UPDATE orders SET 
            restocked_at = datetime('now'),
            reservation_status = 'released',
            updated_at = datetime('now')
           WHERE id = ?`
        ).bind(orderId).run();

        return jsonResponse({
          success: true,
          id: orderId,
          restocked_count: restoredCount,
          restocked_at: new Date().toISOString(),
          message: `Successfully restocked ${restoredCount} item(s) for order ${orderId}.`
        });
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/admin/release-expired OR GET /api/scheduled/release-expired
      // Triggers reservation expiry & restoration on demand
      // -------------------------------------------------------------
      if ((path === '/api/admin/release-expired' || path === '/api/scheduled/release-expired') && (method === 'POST' || method === 'GET')) {
        const result = await releaseExpiredReservations(env);
        return jsonResponse({
          success: true,
          releasedCount: result.releasedCount,
          releasedOrderIds: result.orderIds,
          timestamp: new Date().toISOString()
        });
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/admin/products
      // Create or edit a product size/length variant:
      // Preserves shared product_id and slug across variants in product group.
      // Reuses same image set (image1, image2, image3) across variants in group.
      // Validates prices, quantities, and input.
      // -------------------------------------------------------------
      if (path === '/api/admin/products' && method === 'POST') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const contentType = request.headers.get('content-type') || '';
        let rowId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        let productId = '';
        let name = '';
        let size = 'XXL';
        let length = '56"';
        let quantity = 1;
        let price = 0;
        let originalPrice = null;
        let category = 'Luxury';
        let fabric = 'Dubai Nida';
        let detailedFabric = '';
        let description = '';
        let collection = '';
        let image1 = '', image2 = '', image3 = '';
        let isFeatured = 0;

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          rowId = (formData.get('id') || rowId).toString().trim();
          name = (formData.get('name') || '').toString().trim();
          size = normalizeSize((formData.get('size') || 'XXL').toString().trim());
          productId = (formData.get('product_id') || formData.get('productId') || '').toString().trim();
          length = normalizeLength(formData.get('length')?.toString() || '56"');
          price = parseFloat(formData.get('price')?.toString() || '0') || 0;
          const orig = formData.get('original_price') || formData.get('originalPrice') || formData.get('offer_price');
          originalPrice = orig ? parseFloat(orig.toString()) : null;
          quantity = size === 'Custom' ? 9999 : (parseInt(formData.get('quantity')?.toString() || '0', 10) || 0);
          category = (formData.get('category') || 'Luxury').toString().trim();
          fabric = (formData.get('fabric') || 'Dubai Nida').toString().trim();
          detailedFabric = (formData.get('detailed_fabric') || formData.get('detailedFabric') || '').toString().trim();
          description = (formData.get('description') || '').toString().trim();
          collection = (formData.get('collection') || '').toString().trim();
          image1 = (formData.get('image1') || '').toString();
          image2 = (formData.get('image2') || '').toString();
          image3 = (formData.get('image3') || '').toString();
          isFeatured = formData.get('is_featured') === '1' || formData.get('is_featured') === 'true' || formData.get('featured') === 'true' ? 1 : 0;

          // Process file uploads to R2 if provided
          if (env.BUCKET) {
            for (let i = 1; i <= 3; i++) {
              const file = formData.get(`image_file_${i}`) || formData.get(`image${i}_file`);
              if (file && typeof file !== 'string' && file.size > 0) {
                const ext = getExtension(file.type || 'image/jpeg', file.name || '');
                const effectiveProdKey = productId || rowId;
                const randomPart = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `${Date.now()}`;
                const r2Key = `laclasse/products/${effectiveProdKey.toLowerCase()}/img-${i}-${Date.now()}-${randomPart}.${ext}`;
                await env.BUCKET.put(r2Key, await file.arrayBuffer(), {
                  httpMetadata: { contentType: file.type || 'image/jpeg' },
                  customMetadata: { productId: effectiveProdKey, index: String(i) },
                });
                const uploadedUrl = resolveAssetUrl(request, env, r2Key);
                if (i === 1) image1 = uploadedUrl;
                if (i === 2) image2 = uploadedUrl;
                if (i === 3) image3 = uploadedUrl;
              }
            }
          }
        } else {
          // JSON Payload
          const body = await request.json().catch(() => ({}));
          rowId = (body.id || rowId).toString().trim();
          name = (body.name || '').toString().trim();
          size = normalizeSize((body.size || 'XXL').toString().trim());
          productId = (body.product_id || body.productId || '').toString().trim();
          length = normalizeLength(body.length || '56"');
          price = parseFloat(body.price || 0) || 0;
          originalPrice = body.original_price !== undefined ? (body.original_price ? parseFloat(body.original_price) : null) : (body.offer_price ? parseFloat(body.offer_price) : null);
          quantity = size === 'Custom' ? 9999 : (parseInt(body.quantity || 0, 10) || 0);
          category = (body.category || 'Luxury').toString().trim();
          fabric = (body.fabric || 'Dubai Nida').toString().trim();
          detailedFabric = (body.detailed_fabric || body.detailedFabric || '').toString().trim();
          description = (body.description || '').toString().trim();
          collection = (body.collection || '').toString().trim();
          image1 = (body.image1 || '').toString();
          image2 = (body.image2 || '').toString();
          image3 = (body.image3 || '').toString();
          isFeatured = (body.is_featured || body.featured) ? 1 : 0;
        }

        if (!name) {
          return jsonResponse({ error: 'Product name is required.' }, 400);
        }
        if (price <= 0) {
          return jsonResponse({ error: 'Valid positive selling price is required.' }, 400);
        }

        // Automatic group productId generation if missing
        if (!productId) {
          const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'LC';
          productId = `LC-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
        }

        // Automatic slug computation: check if group already has a slug to maintain URLs
        let slug = generateSlug(name);
        const { results: existingGroup } = await env.DB.prepare(
          `SELECT slug, image1, image2, image3 FROM products WHERE product_id = ? LIMIT 1`
        ).bind(productId).all();

        if (existingGroup && existingGroup.length > 0) {
          if (existingGroup[0].slug) {
            slug = existingGroup[0].slug;
          }
          // Reuse existing image set across variants if not explicitly replaced
          if (!image1 && existingGroup[0].image1) image1 = existingGroup[0].image1;
          if (!image2 && existingGroup[0].image2) image2 = existingGroup[0].image2;
          if (!image3 && existingGroup[0].image3) image3 = existingGroup[0].image3;
        }

        const thumbnail = image1 || SAFE_PLACEHOLDER_IMAGE;

        // Check if a row with this product_id, size, and length already exists
        const { results: existingVariant } = await env.DB.prepare(
          `SELECT id FROM products WHERE (product_id = ? AND size = ? AND (length = ? OR length IS NULL)) OR id = ? LIMIT 1`
        ).bind(productId, size, length, rowId).all();

        if (existingVariant && existingVariant.length > 0) {
          rowId = existingVariant[0].id;
        }

        await env.DB.prepare(
          `INSERT INTO products (
            id, product_id, name, slug, category, collection, description, detailed_fabric,
            fabric, price, original_price, size, quantity, length, image1, image2, image3,
            thumbnail, is_featured, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            product_id = excluded.product_id,
            name = excluded.name,
            slug = excluded.slug,
            category = excluded.category,
            collection = excluded.collection,
            description = excluded.description,
            detailed_fabric = excluded.detailed_fabric,
            fabric = excluded.fabric,
            price = excluded.price,
            original_price = excluded.original_price,
            size = excluded.size,
            quantity = excluded.quantity,
            length = excluded.length,
            image1 = CASE WHEN excluded.image1 != '' THEN excluded.image1 ELSE products.image1 END,
            image2 = CASE WHEN excluded.image2 != '' THEN excluded.image2 ELSE products.image2 END,
            image3 = CASE WHEN excluded.image3 != '' THEN excluded.image3 ELSE products.image3 END,
            thumbnail = CASE WHEN excluded.thumbnail != '' THEN excluded.thumbnail ELSE products.thumbnail END,
            is_featured = excluded.is_featured,
            updated_at = datetime('now')`
        ).bind(
          rowId, productId, name, slug, category, collection, description, detailedFabric,
          fabric, price, originalPrice, size, quantity, length, image1 || thumbnail, image2 || null, image3 || null,
          thumbnail, isFeatured
        ).run();

        // Propagate image changes consistently across all variants in the same product_id group
        if (image1 || image2 || image3) {
          await env.DB.prepare(
            `UPDATE products SET 
              image1 = CASE WHEN ? != '' THEN ? ELSE image1 END,
              image2 = CASE WHEN ? != '' THEN ? ELSE image2 END,
              image3 = CASE WHEN ? != '' THEN ? ELSE image3 END,
              thumbnail = CASE WHEN ? != '' THEN ? ELSE thumbnail END,
              updated_at = datetime('now')
             WHERE product_id = ?`
          ).bind(image1, image1, image2, image2, image3, image3, thumbnail, thumbnail, productId).run();
        }

        return jsonResponse({
          success: true,
          product: {
            id: rowId,
            product_id: productId,
            name,
            slug,
            size,
            length,
            quantity,
            price,
            original_price: originalPrice,
            image1: image1 || thumbnail,
            image2: image2 || null,
            image3: image3 || null,
          }
        }, 201);
      }

      // -------------------------------------------------------------
      // ROUTE: PATCH /api/admin/products/:id/stock
      // Stock adjustment for a specific variant
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/products/') && path.endsWith('/stock') && method === 'PATCH') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const id = decodeURIComponent(path.replace('/api/admin/products/', '').replace('/stock', ''));
        const body = await request.json();
        const newQuantity = parseInt(body.quantity, 10);

        if (isNaN(newQuantity) || newQuantity < 0) {
          return jsonResponse({ error: 'Valid non-negative quantity required.' }, 400);
        }

        await env.DB.prepare(
          "UPDATE products SET quantity = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
        ).bind(newQuantity, id).run();

        return jsonResponse({ success: true, id, quantity: newQuantity });
      }

      // -------------------------------------------------------------
      // ROUTE: DELETE /api/admin/products/:id
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/products/') && method === 'DELETE') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Admin access required' }, 401);
        }
        if (!env.DB) {
          return jsonResponse({ error: 'D1 database binding missing (env.DB)' }, 500);
        }

        const id = decodeURIComponent(path.replace('/api/admin/products/', ''));
        const isGroup = url.searchParams.get('group') === 'true';

        if (isGroup) {
          await env.DB.prepare('DELETE FROM products WHERE product_id = ? OR id = ?').bind(id, id).run();
          return jsonResponse({ success: true, message: `All variants for product ${id} deleted.` });
        } else {
          await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true, message: `Product variant ${id} deleted.` });
        }
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/coupons/verify
      // -------------------------------------------------------------
      if (path === '/api/coupons/verify' && method === 'POST') {
        if (!env.DB) return jsonResponse({ error: 'D1 database binding missing' }, 500);
        const body = await request.json();
        const code = (body.code || '').trim().toUpperCase();
        const totalAmount = Number(body.totalAmount ?? body.amount ?? 0);

        if (!code) return jsonResponse({ error: 'Coupon code required' }, 400);

        const { results } = await env.DB.prepare(
          'SELECT * FROM coupons WHERE UPPER(code) = ? AND active = 1 LIMIT 1'
        ).bind(code).all();

        if (!results || results.length === 0) {
          return jsonResponse({ valid: false, error: 'Invalid or inactive promo voucher code.' }, 404);
        }

        const coupon = results[0];
        if (coupon.min_purchase && totalAmount < coupon.min_purchase) {
          return jsonResponse({
            valid: false,
            error: `Coupon ${code} requires minimum purchase of ₹${coupon.min_purchase.toLocaleString('en-IN')}.`
          }, 400);
        }

        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
          discountAmount = Math.round((totalAmount * coupon.discount_value) / 100);
        } else {
          discountAmount = Math.min(totalAmount, coupon.discount_value);
        }

        return jsonResponse({
          valid: true,
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          discountAmount,
          coupon: {
            code: coupon.code,
            discountType: coupon.discount_type,
            discountValue: coupon.discount_value,
            minPurchase: coupon.min_purchase || 0,
            expiryDate: coupon.expiry_date || '2026-12-31',
            active: Boolean(coupon.active)
          },
          message: `Coupon ${code} applied successfully!`
        });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/admin/coupons
      // -------------------------------------------------------------
      if (path === '/api/admin/coupons' && method === 'GET') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse([]);
        const { results } = await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
        return jsonResponse(results || []);
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/admin/coupons
      // -------------------------------------------------------------
      if (path === '/api/admin/coupons' && method === 'POST') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse({ error: 'D1 missing' }, 500);
        const body = await request.json();
        const code = (body.code || '').trim().toUpperCase();
        if (!code) return jsonResponse({ error: 'Coupon code required' }, 400);

        await env.DB.prepare(
          `INSERT INTO coupons (code, discount_type, discount_value, min_purchase, expiry_date, active)
           VALUES (?, ?, ?, ?, ?, 1)
           ON CONFLICT(code) DO UPDATE SET
             discount_type = excluded.discount_type,
             discount_value = excluded.discount_value,
             min_purchase = excluded.min_purchase,
             expiry_date = excluded.expiry_date,
             active = 1`
        ).bind(
          code,
          body.discountType || body.discount_type || 'percentage',
          Number(body.discountValue || body.discount_value || 10),
          Number(body.minPurchase || body.min_purchase || 0),
          body.expiryDate || body.expiry_date || '2026-12-31'
        ).run();

        return jsonResponse({ success: true, code });
      }

      // -------------------------------------------------------------
      // ROUTE: DELETE /api/admin/coupons/:code
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/coupons/') && method === 'DELETE') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse({ error: 'D1 missing' }, 500);
        const code = decodeURIComponent(path.replace('/api/admin/coupons/', '')).toUpperCase();
        await env.DB.prepare('DELETE FROM coupons WHERE UPPER(code) = ?').bind(code).run();
        return jsonResponse({ success: true, message: `Coupon ${code} deleted.` });
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/newsletter
      // -------------------------------------------------------------
      if (path === '/api/newsletter' && method === 'POST') {
        if (!env.DB) return jsonResponse({ error: 'D1 database binding missing' }, 500);
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) return jsonResponse({ error: 'Valid email required' }, 400);

        await env.DB.prepare(
          "INSERT OR IGNORE INTO subscribers (email, subscribed_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))"
        ).bind(email).run();

        return jsonResponse({
          success: true,
          couponCode: 'WELCOME10',
          discountValue: 10,
          message: 'Thank you for subscribing! Use WELCOME10 for 10% off.'
        });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/admin/subscribers
      // -------------------------------------------------------------
      if (path === '/api/admin/subscribers' && method === 'GET') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse([]);
        const { results } = await env.DB.prepare('SELECT * FROM subscribers ORDER BY subscribed_at DESC').all();
        return jsonResponse(results || []);
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/contact
      // -------------------------------------------------------------
      if (path === '/api/contact' && method === 'POST') {
        if (!env.DB) return jsonResponse({ error: 'D1 database binding missing' }, 500);
        const body = await request.json();
        const id = `msg_${Date.now()}`;
        await env.DB.prepare(
          "INSERT INTO messages (id, name, email, phone, message, status, created_at) VALUES (?, ?, ?, ?, ?, 'Unread', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))"
        ).bind(id, body.name || '', body.email || '', body.phone || '', body.message || '').run();

        return jsonResponse({ success: true, message: 'Message sent successfully.' });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/admin/contacts
      // -------------------------------------------------------------
      if (path === '/api/admin/contacts' && method === 'GET') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse([]);
        const { results } = await env.DB.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
        return jsonResponse(results || []);
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/reviews
      // -------------------------------------------------------------
      if (path === '/api/reviews' && method === 'GET') {
        if (!env.DB) return jsonResponse([]);
        const { results } = await env.DB.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
        return jsonResponse(results || []);
      }

      // -------------------------------------------------------------
      // ROUTE: POST /api/reviews
      // -------------------------------------------------------------
      if (path === '/api/reviews' && method === 'POST') {
        if (!env.DB) return jsonResponse({ error: 'D1 database binding missing' }, 500);
        const body = await request.json();
        const id = `rev_${Date.now()}`;
        await env.DB.prepare(
          "INSERT INTO reviews (id, product_id, customer_name, rating, review_text, approved, verified_purchase, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))"
        ).bind(id, body.productId || '', body.customerName || '', Number(body.rating || 5), body.reviewText || '').run();

        return jsonResponse({ success: true, id, message: 'Review submitted for moderation.' });
      }

      // -------------------------------------------------------------
      // ROUTE: PATCH /api/admin/reviews/:id
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/reviews/') && method === 'PATCH') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse({ error: 'D1 missing' }, 500);
        const id = decodeURIComponent(path.replace('/api/admin/reviews/', ''));
        const body = await request.json();
        const approved = body.approved ? 1 : 0;
        await env.DB.prepare('UPDATE reviews SET approved = ? WHERE id = ?').bind(approved, id).run();
        return jsonResponse({ success: true, id, approved });
      }

      // -------------------------------------------------------------
      // ROUTE: DELETE /api/admin/reviews/:id
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/reviews/') && method === 'DELETE') {
        if (!verifyAdmin(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        if (!env.DB) return jsonResponse({ error: 'D1 missing' }, 500);
        const id = decodeURIComponent(path.replace('/api/admin/reviews/', ''));
        await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true, id });
      }

      // -------------------------------------------------------------
      // ROUTE: GET /api/admin/verify
      // -------------------------------------------------------------
      if (path === '/api/admin/verify' && method === 'GET') {
        if (!verifyAdmin(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Invalid Admin Secret' }, 401);
        }
        return jsonResponse({ success: true, message: 'Admin verified' });
      }

      // 404 for unmatched API routes
      return jsonResponse({ error: `Not found: ${method} ${path}` }, 404);

    } catch (err) {
      console.error('[Worker Error]:', err);
      return jsonResponse({ error: err.message || 'Worker Internal Server Error' }, 500);
    }
  }
};
