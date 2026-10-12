import { Product } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction, getR2PublicUrl } from '../utils/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves image URL against configured Cloudflare R2 delivery domain.
 * Supports absolute URLs, relative R2 keys, and handles null/empty gracefully.
 */
export function resolveProductImageUrl(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const base = getR2PublicUrl().replace(/\/+$/, '');
  const cleanKey = trimmed.replace(/^\/+/, '');
  return `${base}/${cleanKey}`;
}

export function generateSlug(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeSize(size: string): string {
  const s = String(size || '').trim();
  if (s.toUpperCase() === '2XL' || s.toUpperCase() === 'XXL') return 'XXL';
  if (s.toLowerCase() === 'free size' || s.toLowerCase() === 'freesize') return 'Free Size';
  return s;
}

export function normalizeLength(len: any): string | null {
  if (!len) return null;
  const str = String(len).trim();
  if (str.endsWith('"')) return str;
  return `${str}"`;
}

/**
 * Groups variant rows from Supabase `products` table into cohesive garment catalog cards.
 */
export function groupProductVariants(rows: any[]): Product[] {
  if (!rows || rows.length === 0) return [];

  const groupedMap = new Map<string, any>();

  for (const row of rows) {
    const groupKey = row.product_id || row.slug || row.id;
    const normSize = normalizeSize(row.size);
    const normLen = normalizeLength(row.length);
    const variantQty = Math.max(0, Number(row.quantity ?? 0));

    if (!groupedMap.has(groupKey)) {
      const img1 = resolveProductImageUrl(row.image1);
      const img2 = resolveProductImageUrl(row.image2);
      const img3 = resolveProductImageUrl(row.image3);
      const thumb = resolveProductImageUrl(row.thumbnail) || img1;
      const allImages = [img1, img2, img3].filter(Boolean) as string[];

      groupedMap.set(groupKey, {
        id: row.id,
        productId: row.product_id || groupKey,
        product_id: row.product_id || groupKey,
        productCode: row.product_id || groupKey,
        product_code: row.product_id || groupKey,
        name: row.name,
        slug: row.slug || generateSlug(row.name),
        category: row.category || 'Luxury',
        collection: row.collection || `${row.category || 'Luxury'} Signature`,
        description: row.description || '',
        detailedFabric: row.detailed_fabric || (row.fabric ? `Crafted from fine ${row.fabric}.` : 'Fine fabric.'),
        detailed_fabric: row.detailed_fabric || '',
        fabric: row.fabric || 'Dubai Nida',
        price: Number(row.price),
        originalPrice: row.original_price ? Number(row.original_price) : null,
        original_price: row.original_price ? Number(row.original_price) : null,
        offerPrice: row.original_price ? Number(row.original_price) : null,
        offer_price: row.original_price ? Number(row.original_price) : null,
        featured: Boolean(row.is_featured),
        is_featured: Boolean(row.is_featured),
        newArrival: Boolean(row.is_new_arrival ?? true),
        is_new_arrival: Boolean(row.is_new_arrival ?? true),
        flashSale: Boolean(row.is_flash_sale),
        is_flash_sale: Boolean(row.is_flash_sale),
        active: Boolean(row.is_active),
        is_active: row.is_active ? 1 : 0,
        careInstructions: row.care_instructions || 'Dry clean recommended.',
        care_instructions: row.care_instructions || '',
        includesMatchingSheila: row.includes_matching_sheila !== undefined ? Boolean(row.includes_matching_sheila) : true,
        includes_matching_sheila: row.includes_matching_sheila !== undefined ? Boolean(row.includes_matching_sheila) : true,
        image1: img1,
        image2: img2,
        image3: img3,
        images: allImages,
        thumbnail: thumb,
        rating: Number(row.rating || 5.0),
        reviewCount: Number(row.review_count || 0),
        review_count: Number(row.review_count || 0),
        createdAt: row.created_at,
        created_at: row.created_at,
        variants: [],
        sizes: [],
        lengths: [],
        sizeStock: {} as Record<string, number>,
        variantStock: {} as Record<string, number>,
        totalStock: 0,
      });
    }

    const group = groupedMap.get(groupKey);

    group.variants.push({
      id: row.id,
      size: normSize,
      length: normLen,
      quantity: variantQty,
      price: Number(row.price),
    });

    if (!group.sizes.includes(normSize)) {
      group.sizes.push(normSize);
    }
    if (normLen && !group.lengths.includes(normLen)) {
      group.lengths.push(normLen);
    }

    group.sizeStock[normSize] = (group.sizeStock[normSize] || 0) + variantQty;
    if (normLen) {
      group.variantStock[`${normSize}_${normLen}`] = variantQty;
    }
    group.variantStock[row.id] = variantQty;
    group.totalStock += variantQty;
  }

  // Finalize each garment group
  for (const group of groupedMap.values()) {
    if (!group.sizes.includes('Custom')) {
      group.sizes.push('Custom');
    }
    group.sizeStock['Custom'] = 9999;
    group.quantity = group.totalStock;
    group.stock = group.totalStock;

    if (group.lengths.length > 0) {
      group.length = group.lengths[0];
    } else {
      group.lengths = ['56"'];
      group.length = '56"';
    }
  }

  return Array.from(groupedMap.values());
}

/**
 * Fetch active products directly from Supabase PostgreSQL.
 * Never falls back to hardcoded mock products or local storage cache.
 */
export const fetchProducts = async (): Promise<Product[]> => {
  if (!isSupabaseConfigured()) {
    console.error('[fetchProducts Error]: Supabase is not configured.');
    throw new Error('Supabase backend configuration is missing.');
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchProducts Supabase Error]:', error.message, error.code);
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return groupProductVariants(data);
  } catch (err: any) {
    console.error('[fetchProducts Failure]:', err.message);
    throw err;
  }
};

/**
 * Fetch distinct active categories from live Supabase products
 */
export const fetchCategories = async (): Promise<string[]> => {
  try {
    const prods = await fetchProducts();
    if (prods.length > 0) {
      const unique = Array.from(new Set(prods.map(p => p.category?.trim()).filter(Boolean) as string[]));
      return ['All', ...unique];
    }
  } catch (err) {
    console.warn('[fetchCategories Error]:', err);
  }

  return ['All', 'Luxury', 'Bridal', 'Premium', 'Casual'];
};

/**
 * Fetch single product by slug, product_id, or UUID from Supabase.
 * Uses type-aware queries to avoid PostgREST 22P02 invalid UUID cast error.
 */
export const fetchProductBySlug = async (slugOrId: string): Promise<Product | null> => {
  if (!isSupabaseConfigured() || !slugOrId) return null;

  try {
    const supabase = getSupabase();
    const cleanParam = slugOrId.trim();
    const isUuid = UUID_REGEX.test(cleanParam);

    let query = supabase.from('products').select('*').eq('is_active', true);

    if (isUuid) {
      query = query.or(`id.eq.${cleanParam},slug.eq.${cleanParam}`);
    } else {
      query = query.or(`slug.eq.${cleanParam},product_id.eq.${cleanParam}`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchProductBySlug Error]:', error.message, error.code);
      return null;
    }

    if (!data || data.length === 0) return null;

    const grouped = groupProductVariants(data);
    return grouped.length > 0 ? grouped[0] : null;
  } catch (e: any) {
    console.error('[fetchProductBySlug Failure]:', e.message);
    return null;
  }
};

/**
 * Admin: Create or update product variant via Supabase Edge Function
 * Uploads image files to Cloudflare R2 via r2-images Edge Function if provided
 */
export const createProduct = async (
  product: Partial<Product>,
  imageFiles?: (File | null)[]
): Promise<boolean> => {
  const payload: any = { ...product };

  // 1. Upload new image files to Cloudflare R2 via r2-images Edge Function
  if (imageFiles && imageFiles.some(f => f !== null)) {
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('product_id', product.productId || product.product_id || 'shared');
        formData.append('slot', String(i + 1));

        try {
          const edgeRes = await invokeEdgeFunction<any>('r2-images', {
            method: 'POST',
            body: formData,
          });
          if (edgeRes?.url) {
            if (i === 0) payload.image1 = edgeRes.url;
            if (i === 1) payload.image2 = edgeRes.url;
            if (i === 2) payload.image3 = edgeRes.url;
          }
        } catch (uploadErr: any) {
          console.error(`[r2-images upload error for slot ${i + 1}]:`, uploadErr.message);
          throw new Error(`Failed to upload image slot ${i + 1}: ${uploadErr.message}`);
        }
      }
    }
  }

  // 2. Persist product and variants via admin-products Edge Function
  try {
    await invokeEdgeFunction('admin-products', {
      method: 'POST',
      body: payload,
    });
    return true;
  } catch (err: any) {
    console.error('[createProduct Error]:', err.message);
    throw err;
  }
};

/**
 * Admin: Update quantity for a specific variant via admin-products Edge Function
 */
export const updateProductStock = async (id: string, quantity: number): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-products', {
      method: 'PATCH',
      body: { id, quantity },
    });
    return true;
  } catch (err: any) {
    console.error('[updateProductStock Error]:', err.message);
    throw err;
  }
};

/**
 * Admin: Delete single variant or entire product group via admin-products Edge Function
 */
export const deleteProduct = async (productId: string, isGroup: boolean = false): Promise<boolean> => {
  try {
    const query = isGroup ? `?id=${encodeURIComponent(productId)}&is_group=true` : `?id=${encodeURIComponent(productId)}`;
    await invokeEdgeFunction(`admin-products${query}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err: any) {
    console.error('[deleteProduct Error]:', err.message);
    throw err;
  }
};
