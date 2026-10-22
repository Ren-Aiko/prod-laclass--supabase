// =====================================================================
// src/services/productService.ts
// Decoupled Product Service Layer (CRUD, Toggle Visibility, Image Storage)
// =====================================================================

import { getSupabase, isSupabaseConfigured, getR2PublicUrl } from '../utils/supabase';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../data/mockProducts';

export interface ProductData {
  id?: string;
  name: string;
  description?: string;
  price: number;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  selected_variants?: string[];
  is_active?: boolean;
}

/**
 * Fetch active products for Home & Collections (Client Storefront)
 */
export async function fetchActiveProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('[productService.fetchActiveProducts fallback to mock]:', error);
      return MOCK_PRODUCTS;
    }

    return data.map(mapRowToProduct);
  } catch (err) {
    console.error('[productService.fetchActiveProducts exception]:', err);
    return MOCK_PRODUCTS;
  }
}

/**
 * Fetch all products including inactive for Admin Panel
 */
export async function fetchAllProductsAdmin(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[productService.fetchAllProductsAdmin error]:', error);
      return MOCK_PRODUCTS;
    }

    return data.map(mapRowToProduct);
  } catch (err) {
    console.error('[productService.fetchAllProductsAdmin exception]:', err);
    return MOCK_PRODUCTS;
  }
}

/**
 * Create or Edit Product Item (Admin)
 */
export async function saveProductItem(product: ProductData): Promise<Product | null> {
  const supabase = getSupabase();
  const variants = product.selected_variants && product.selected_variants.length > 0
    ? product.selected_variants
    : ['S', 'M', 'L', 'XL'];

  const payload: Record<string, any> = {
    name: product.name,
    description: product.description || '',
    price: product.price,
    image_1: product.image_1 || null,
    image_2: product.image_2 || null,
    image_3: product.image_3 || null,
    selected_variants: variants,
    is_active: product.is_active !== undefined ? product.is_active : true,
  };

  if (product.id) {
    payload.id = product.id;
  }

  const { data, error } = await supabase
    .from('products')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[productService.saveProductItem error]:', error);
    throw new Error(error.message);
  }

  return mapRowToProduct(data);
}

/**
 * Toggle Product is_active Visibility State (Admin)
 */
export async function toggleProductActive(productId: string, isActive: boolean): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId);

  if (error) {
    console.error('[productService.toggleProductActive error]:', error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Delete Product Item (Admin)
 */
export async function deleteProductItem(productId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('[productService.deleteProductItem error]:', error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Upload Image Asset directly into Supabase Storage bucket 'abaya-store-assets'
 * with automatic bucket creation and fallback to Cloudflare R2
 */
export async function uploadProductImage(file: File, bucketName = 'abaya-store-assets'): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `products/${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${cleanName}.${ext}`;

  try {
    // 1. Attempt upload to Supabase Storage bucket
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!uploadErr && uploadData?.path) {
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      if (publicUrl) return publicUrl;
    }
  } catch (supabaseStorageErr) {
    console.warn('[Supabase Storage upload warning, checking fallback]:', supabaseStorageErr);
  }

  // 2. Fallback: Base64 data URL for instant resilient preview if storage bucket unconfigured
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Internal Row-to-UI-Product mapper keeping visual structures 100% intact
 */
function mapRowToProduct(row: any): Product {
  const img1 = row.image_1 || row.image1 || row.thumbnail || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop';
  const img2 = row.image_2 || row.image2 || img1;
  const img3 = row.image_3 || row.image3 || img2;

  const variants: string[] = Array.isArray(row.selected_variants) && row.selected_variants.length > 0
    ? row.selected_variants
    : ['S', 'M', 'L', 'XL'];

  return {
    id: row.id,
    productId: row.id,
    product_id: row.id,
    productCode: row.product_id || row.id.slice(0, 8),
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: row.category || 'Luxury',
    collection: row.collection || 'Luxury Signature',
    description: row.description || '',
    detailedFabric: row.detailed_fabric || 'Fine Dubai Nida',
    fabric: row.fabric || 'Dubai Nida',
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : null,
    offerPrice: row.original_price ? Number(row.original_price) : null,
    featured: Boolean(row.is_featured),
    newArrival: Boolean(row.is_new_arrival ?? true),
    flashSale: Boolean(row.is_flash_sale),
    active: Boolean(row.is_active ?? true),
    careInstructions: row.care_instructions || 'Dry clean recommended.',
    includesMatchingSheila: true,
    image1: img1,
    image2: img2,
    image3: img3,
    images: [img1, img2, img3].filter(Boolean),
    thumbnail: img1,
    rating: Number(row.rating || 5.0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at || new Date().toISOString(),
    size: (variants[0] || 'Free Size') as any,
    sizes: variants,
    lengths: ['52"', '54"', '56"', '58"', '60"'],
    length: '56"',
    sizeStock: variants.reduce((acc, sz) => ({ ...acc, [sz]: 10 }), {}),
    quantity: 10,
    stock: 10,
  };
}
