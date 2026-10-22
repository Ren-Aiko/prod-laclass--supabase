import { Product, SizeStockItem } from '../types';
import { getSupabase, isSupabaseConfigured, invokeEdgeFunction, getR2PublicUrl } from '../utils/supabase';

export function resolveProductImageUrl(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();
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
 * Fetch active products directly from Supabase PostgreSQL (Public Read via RLS)
 */
export const fetchProducts = async (): Promise<Product[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase credentials not configured in environment or settings.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[fetchProducts Supabase status]:', error.code, error.message);
    if (error.code === 'PGRST205') {
      throw new Error('Trouble connecting to our servers. (Table public.products not found in schema cache. Run schema migration in Supabase SQL Editor)');
    }
    throw new Error(`Trouble connecting to our servers. (${error.message})`);
  }

  return groupProductVariants(data || []);
};

/**
 * Fetch distinct active categories directly from Supabase
 */
export const fetchCategories = async (): Promise<string[]> => {
  if (!isSupabaseConfigured()) {
    return ['All', 'Premium', 'Bridal', 'Casual', 'Luxury'];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true);

    if (error || !data) {
      return ['All', 'Premium', 'Bridal', 'Casual', 'Luxury'];
    }

    const uniqueCategories = Array.from(
      new Set(data.map(d => d.category?.trim()).filter(Boolean))
    );

    return uniqueCategories.length > 0 ? ['All', ...uniqueCategories] : ['All', 'Premium', 'Bridal', 'Casual', 'Luxury'];
  } catch {
    return ['All', 'Premium', 'Bridal', 'Casual', 'Luxury'];
  }
};

/**
 * Fetch single product by slug or product_id
 */
export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`slug.eq.${slug},product_id.eq.${slug},id.eq.${slug}`)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return null;

    const grouped = groupProductVariants(data);
    return grouped.length > 0 ? grouped[0] : null;
  } catch (e) {
    console.warn('[fetchProductBySlug error]:', e);
    return null;
  }
};

/**
 * Admin: Create or update product variant via Edge Function
 * Uploads image files to Cloudflare R2 if provided
 */
export const createProduct = async (
  product: Partial<Product>,
  imageFiles?: (File | null)[]
): Promise<boolean> => {
  try {
    const payload: any = { ...product };

    // If new image files were selected, upload them to R2 first
    if (imageFiles && imageFiles.some(f => f !== null)) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('product_id', product.productId || product.product_id || 'shared');
          formData.append('slot', String(i + 1));

          const res = await invokeEdgeFunction<any>('r2-images', {
            method: 'POST',
            body: formData,
          });

          if (res?.url) {
            if (i === 0) payload.image1 = res.url;
            if (i === 1) payload.image2 = res.url;
            if (i === 2) payload.image3 = res.url;
          }
        }
      }
    }

    await invokeEdgeFunction('admin-products', {
      method: 'POST',
      body: payload,
    });

    return true;
  } catch (err: any) {
    console.error('[createProduct Error]:', err);
    throw err;
  }
};

/**
 * Admin: Update quantity for a specific variant
 */
export const updateProductStock = async (id: string, quantity: number): Promise<boolean> => {
  try {
    await invokeEdgeFunction('admin-products', {
      method: 'PATCH',
      body: { id, quantity },
    });
    return true;
  } catch (err: any) {
    console.error('[updateProductStock Error]:', err);
    throw err;
  }
};

/**
 * Admin: Delete single variant or entire product group
 */
export const deleteProduct = async (productId: string, isGroup: boolean = false): Promise<boolean> => {
  try {
    const query = isGroup ? `?id=${encodeURIComponent(productId)}&group=true` : `?id=${encodeURIComponent(productId)}`;
    await invokeEdgeFunction(`admin-products${query}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err: any) {
    console.error('[deleteProduct Error]:', err);
    throw err;
  }
};
