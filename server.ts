import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const mediaDir = path.resolve(dataDir, 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.resolve(dataDir, 'laclasse.sqlite');
const sqlite = new DatabaseSync(dbPath);

// Execute schema
const schemaSqlPath = path.resolve(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaSqlPath)) {
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');
  sqlite.exec(schemaSql);
}

// ---------------------------------------------------------------------
// Seed the 9 Garments and 35 Inventory Variants if products table is empty
// ---------------------------------------------------------------------
const checkCount = sqlite.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
if (checkCount.count === 0) {
  console.log('[Database Seed]: Initializing the 9 product groups and 35 stock variants...');

  const insertStmt = sqlite.prepare(`
    INSERT INTO products (
      id, product_id, name, slug, category, collection, description, detailed_fabric,
      fabric, price, original_price, size, quantity, length, image1, image2, image3,
      thumbnail, is_featured, is_new_arrival, is_flash_sale, is_active,
      care_instructions, includes_matching_sheila, rating, review_count, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 1,
      ?, 1, 5.0, ?, datetime('now'), datetime('now')
    )
  `);

  const garmentDefs = [
    {
      productId: 'LC001',
      name: 'Noir Royal Dubai Abaya',
      slug: 'noir-royal-dubai-abaya',
      category: 'Luxury',
      collection: 'Noir Royal',
      description: 'An iconic Dubai silhouette draped in pure breathable Nida. Hand-finished sleeve cuffs with subtle gold threading for understated evening elegance.',
      detailedFabric: 'Imported Dubai Nida — ultra-matte, opaque, cool-touch, and wrinkle-resistant for seamless all-day wear.',
      fabric: 'Dubai Nida',
      price: 14999,
      originalPrice: 16999,
      image1: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=900&auto=format&fit=crop',
      isFeatured: 1,
      isNewArrival: 0,
      isFlashSale: 0,
      careInstructions: 'Dry clean recommended or gentle cold hand wash. Steam lightly on reverse.',
      reviewCount: 14,
      variants: [
        { size: 'XXL', length: '56"', quantity: 1 }
      ]
    },
    {
      productId: 'LC002',
      name: 'Zahra Imperial Embroidered Abaya',
      slug: 'zahra-imperial-embroidered-abaya',
      category: 'Bridal',
      collection: 'Imperial Heritage',
      description: 'Masterfully hand-embroidered floral motifs along the lapel and sleeve cuffs. Designed for weddings, receptions, and memorable galas.',
      detailedFabric: 'Indonesian Zoom with micro-texture — structured drape with fluid movement.',
      fabric: 'Indonesian Zoom',
      price: 18999,
      originalPrice: 21999,
      image1: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=900&auto=format&fit=crop',
      isFeatured: 1,
      isNewArrival: 1,
      isFlashSale: 0,
      careInstructions: 'Specialist dry clean only. Protect embroidery when pressing.',
      reviewCount: 9,
      variants: [
        { size: 'L', length: '56"', quantity: 1 },
        { size: 'XL', length: '56"', quantity: 1 },
        { size: 'XXL', length: '56"', quantity: 1 }
      ]
    },
    {
      productId: 'LC003',
      name: 'Medina Pure Silk Satin Abaya',
      slug: 'medina-pure-silk-satin-abaya',
      category: 'Premium',
      collection: 'Medina Reverie',
      description: 'Subtle liquid luster in deep midnight tone. Tailored with French seams and a relaxed silhouette that moves effortlessly.',
      detailedFabric: 'Pure Silk Satin weave — luminous sheen with a lightweight, breathable feel.',
      fabric: 'Silk Satin',
      price: 15499,
      originalPrice: 17499,
      image1: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      isFeatured: 0,
      isNewArrival: 1,
      isFlashSale: 0,
      careInstructions: 'Dry clean recommended. Low steam with protective cloth.',
      reviewCount: 6,
      variants: [
        { size: 'L', length: '56"', quantity: 1 },
        { size: 'XL', length: '56"', quantity: 1 },
        { size: 'XXL', length: '56"', quantity: 1 }
      ]
    },
    {
      productId: 'LC004',
      name: 'Soraya Pearl Organza Abaya',
      slug: 'soraya-pearl-organza-abaya',
      category: 'Luxury',
      collection: 'Soraya Atelier',
      description: 'Sheer gossamer organza outer layer over an opaque inner slip, embellished with hand-sewn freshwater pearl accents.',
      detailedFabric: 'Organza Silk with fine French trim — ethereal, structured, and radiant under ambient chandeliers.',
      fabric: 'Organza Silk',
      price: 19999,
      originalPrice: 23999,
      image1: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      isFeatured: 1,
      isNewArrival: 0,
      isFlashSale: 0,
      careInstructions: 'Delicate dry clean only.',
      reviewCount: 8,
      variants: [
        { size: 'L', length: '56"', quantity: 1 },
        { size: 'XL', length: '56"', quantity: 1 },
        { size: 'XXL', length: '56"', quantity: 1 }
      ]
    },
    {
      productId: 'LC005',
      name: 'Layla Chiffon Layered Abaya',
      slug: 'layla-chiffon-layered-abaya',
      category: 'Casual',
      collection: 'Layla Flow',
      description: 'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
      detailedFabric: 'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
      fabric: 'Korean Chiffon',
      price: 9999,
      originalPrice: 11999,
      image1: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      isFeatured: 0,
      isNewArrival: 1,
      isFlashSale: 1,
      careInstructions: 'Machine wash delicate cycle in laundry bag or cold hand wash.',
      reviewCount: 11,
      variants: [
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]
    },
    {
      productId: 'LC006',
      name: 'Amina Velvet Crêpe Evening Abaya',
      slug: 'amina-velvet-crepe-evening-abaya',
      category: 'Luxury',
      collection: 'Amina Royal',
      description: 'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
      detailedFabric: 'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
      fabric: 'Velvet Crêpe',
      price: 16499,
      originalPrice: 18999,
      image1: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      isFeatured: 1,
      isNewArrival: 0,
      isFlashSale: 0,
      careInstructions: 'Dry clean only. Steam from inside out.',
      reviewCount: 7,
      variants: [
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]
    },
    {
      productId: 'LC007',
      name: 'Qamar Minimalist Linen Abaya',
      slug: 'qamar-minimalist-linen-abaya',
      category: 'Casual',
      collection: 'Qamar Daily',
      description: 'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
      detailedFabric: 'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
      fabric: 'Linen Cotton',
      price: 8999,
      originalPrice: 10499,
      image1: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      isFeatured: 0,
      isNewArrival: 0,
      isFlashSale: 0,
      careInstructions: 'Machine wash cold. Line dry in shade.',
      reviewCount: 5,
      variants: [
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]
    },
    {
      productId: 'LC008',
      name: 'Yasmina Gold Zari Embroidered Abaya',
      slug: 'yasmina-gold-zari-embroidered-abaya',
      category: 'Bridal',
      collection: 'Yasmina Royale',
      description: 'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
      detailedFabric: 'Dubai Nida with hand-applied Gold Zari bullion thread.',
      fabric: 'Dubai Nida',
      price: 22999,
      originalPrice: 26999,
      image1: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=900&auto=format&fit=crop',
      isFeatured: 1,
      isNewArrival: 0,
      isFlashSale: 0,
      careInstructions: 'Specialist dry clean only. Store wrapped in acid-free tissue.',
      reviewCount: 16,
      variants: [
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]
    },
    {
      productId: 'LC009',
      name: 'Fatima Signature Monogram Abaya',
      slug: 'fatima-signature-monogram-abaya',
      category: 'Premium',
      collection: 'Fatima Signature',
      description: 'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
      detailedFabric: 'Indonesian Zoom with micro-Jacquard monogram pattern.',
      fabric: 'Indonesian Zoom',
      price: 12499,
      originalPrice: 14499,
      image1: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=900&auto=format&fit=crop',
      image2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=900&auto=format&fit=crop',
      image3: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=900&auto=format&fit=crop',
      isFeatured: 0,
      isNewArrival: 1,
      isFlashSale: 0,
      careInstructions: 'Gentle cycle cold wash. Low steam iron.',
      reviewCount: 10,
      variants: [
        { size: 'Free Size', length: '52"', quantity: 1 },
        { size: 'Free Size', length: '54"', quantity: 1 },
        { size: 'Free Size', length: '56"', quantity: 1 },
        { size: 'Free Size', length: '58"', quantity: 1 },
        { size: 'Free Size', length: '60"', quantity: 1 }
      ]
    }
  ];

  let totalVariantsCreated = 0;
  for (const g of garmentDefs) {
    for (const v of g.variants) {
      const variantId = `prod_${g.productId.toLowerCase()}_${v.size.toLowerCase().replace(/\s+/g, '')}_${v.length.replace(/"/g, '')}`;
      insertStmt.run(
        variantId,
        g.productId,
        g.name,
        g.slug,
        g.category,
        g.collection,
        g.description,
        g.detailedFabric,
        g.fabric,
        g.price,
        g.originalPrice,
        v.size,
        v.quantity,
        v.length,
        g.image1,
        g.image2,
        g.image3,
        g.image1,
        g.isFeatured,
        g.isNewArrival,
        g.isFlashSale,
        g.careInstructions,
        g.reviewCount
      );
      totalVariantsCreated++;
    }
  }

  console.log(`[Database Seed]: Successfully created ${garmentDefs.length} garments and ${totalVariantsCreated} inventory variants!`);
}

// ---------------------------------------------------------------------
// Cloudflare D1-compatible Adapter wrapping Node's DatabaseSync
// ---------------------------------------------------------------------
const d1Db = {
  prepare(sql: string) {
    const rawSql = sql;
    return {
      bind(...params: any[]) {
        const boundParams = params.map(p => (p === undefined ? null : p));
        return {
          async all() {
            try {
              const stmt = sqlite.prepare(rawSql);
              const rows = stmt.all(...boundParams);
              return { results: rows, success: true };
            } catch (err: any) {
              console.error('[D1 all() Error]:', err.message, 'SQL:', rawSql);
              throw err;
            }
          },
          async run() {
            try {
              const stmt = sqlite.prepare(rawSql);
              const res = stmt.run(...boundParams);
              return {
                success: true,
                meta: {
                  changes: (res as any).changes ?? 0,
                  last_row_id: (res as any).lastInsertRowid ?? 0
                }
              };
            } catch (err: any) {
              console.error('[D1 run() Error]:', err.message, 'SQL:', rawSql);
              throw err;
            }
          },
          async first() {
            try {
              const stmt = sqlite.prepare(rawSql);
              const row = stmt.get(...boundParams);
              return row || null;
            } catch (err: any) {
              console.error('[D1 first() Error]:', err.message, 'SQL:', rawSql);
              throw err;
            }
          }
        };
      },
      async all() {
        const stmt = sqlite.prepare(rawSql);
        const rows = stmt.all();
        return { results: rows, success: true };
      },
      async run() {
        const stmt = sqlite.prepare(rawSql);
        const res = stmt.run();
        return { success: true, meta: { changes: (res as any).changes ?? 0 } };
      },
      async first() {
        const stmt = sqlite.prepare(rawSql);
        const row = stmt.get();
        return row || null;
      }
    };
  },
  async batch(statements: any[]) {
    // Transaction execution in SQLite
    sqlite.exec('BEGIN TRANSACTION');
    try {
      const results = [];
      for (const s of statements) {
        if (typeof s.run === 'function') {
          results.push(await s.run());
        } else if (typeof s.all === 'function') {
          results.push(await s.all());
        }
      }
      sqlite.exec('COMMIT');
      return results;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }
};

// ---------------------------------------------------------------------
// Cloudflare R2-compatible Adapter wrapping local filesystem storage
// ---------------------------------------------------------------------
const r2Bucket = {
  async get(key: string) {
    const filePath = path.resolve(mediaDir, key.replace(/\//g, '_'));
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.avif') mimeType = 'image/avif';

    return {
      body: buf,
      httpMetadata: { contentType: mimeType },
      httpEtag: `"${Date.now()}"`,
      writeHttpMetadata(headers: Headers) {
        headers.set('Content-Type', mimeType);
      }
    };
  },
  async put(key: string, body: any, options?: any) {
    const filePath = path.resolve(mediaDir, key.replace(/\//g, '_'));
    let buffer: Buffer;
    if (body instanceof ArrayBuffer) {
      buffer = Buffer.from(body);
    } else if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'string') {
      buffer = Buffer.from(body, 'utf-8');
    } else {
      buffer = Buffer.from(await new Response(body).arrayBuffer());
    }
    fs.writeFileSync(filePath, buffer);
    return { key, size: buffer.length };
  },
  async delete(key: string) {
    const filePath = path.resolve(mediaDir, key.replace(/\//g, '_'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
  async list(options?: any) {
    const files = fs.readdirSync(mediaDir);
    return {
      objects: files.map(f => ({ key: f, size: fs.statSync(path.join(mediaDir, f)).size }))
    };
  }
};

// Cloudflare Worker Environment Object
const env = {
  DB: d1Db,
  BUCKET: r2Bucket,
  ADMIN_SECRET: process.env.VITE_ADMIN_SECRET || 'laclasse-secret-2026',
  RESERVATION_EXPIRY_MINUTES: 30,
  R2_PUBLIC_URL: process.env.VITE_R2_PUBLIC_URL || ''
};

// ---------------------------------------------------------------------
// Background Task: Auto-Release Expired Stock Reservations Every 30 Seconds
// ---------------------------------------------------------------------
setInterval(async () => {
  try {
    if (typeof worker.scheduled === 'function') {
      await worker.scheduled({ scheduledTime: Date.now(), cron: '*/5 * * * *' }, env, {});
    }
  } catch (err) {
    console.error('[Cron Execution Error]:', err);
  }
}, 30000);

// ---------------------------------------------------------------------
// Dedicated Keep-Alive Route: Prevents Supabase Free Tier dormancy
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Cloudflare Edge Proxy: /assets/products/:filename
// Proxies asset requests to Supabase storage bucket `abaya-store-assets`
// ---------------------------------------------------------------------
app.get('/assets/products/:filename(*)', async (req, res) => {
  try {
    const filename = req.params.filename;
    const supabaseId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'sfqnaftcpuoyftpjgxbb';
    const targetUrl = `https://${supabaseId}.supabase.co/storage/v1/object/public/abaya-store-assets/${filename}`;

    const remoteRes = await fetch(targetUrl);
    if (remoteRes.ok) {
      const contentType = remoteRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      const arrayBuffer = await remoteRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    const r2Url = `https://pub-de5214d2b1044125bc4e13a67637a92c.r2.dev/${filename}`;
    const r2Res = await fetch(r2Url);
    if (r2Res.ok) {
      const contentType = r2Res.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      const arrayBuffer = await r2Res.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    return res.redirect('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop');
  } catch {
    return res.redirect('https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop');
  }
});

app.get('/api/keep-alive', async (req, res) => {
  const startTime = Date.now();
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sfqnaftcpuoyftpjgxbb.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x1k-8OB-6e4rCuYLuwUjNw_ylVYmLL3';

    // Lightweight row look-up to keep PostgreSQL warm
    const pingRes = await fetch(`${supabaseUrl}/rest/v1/products?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const latencyMs = Date.now() - startTime;
    return res.status(200).json({
      status: pingRes.ok ? 'ok' : 'degraded',
      service: 'LaClassé Supabase Keep-Alive',
      database: 'active',
      httpStatus: pingRes.status,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Keep-alive ping error',
      timestamp: new Date().toISOString()
    });
  }
});

// ---------------------------------------------------------------------
// API Route Handler: Forward /api/* requests to worker.fetch(...)
// ---------------------------------------------------------------------
app.all('/api/*', async (req, res) => {
  try {
    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    // Collect headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Read raw body if present
    let bodyBuffer: Buffer | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      bodyBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined,
      // @ts-ignore
      duplex: 'half'
    });

    const webResponse = await worker.fetch(webRequest, env, {});

    // Transfer status
    res.status(webResponse.status);

    // Transfer headers
    webResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    // Transfer body
    const arrayBuffer = await webResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('[API Proxy Error]:', err);
    res.status(500).json({ error: err.message || 'Server Internal Error' });
  }
});

// ---------------------------------------------------------------------
// Serve Vite frontend in dev mode, or static files in production
// ---------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LaClassé Server]: Running full-stack on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server Start Error]:', err);
});
