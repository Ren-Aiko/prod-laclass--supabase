// =====================================================================
// src/services/product.ts
// Products Service Layer for Supabase PostgreSQL
// =====================================================================

import { supabase } from './client';
import { Product } from '../types/database';

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getActiveProducts error]:', error);
    throw new Error(error.message);
  }
  return (data as Product[]) || [];
}

export async function getProductBySlug(slug: string): Promise<{ product: Product; variants: Product[] } | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true);

  if (error || !data || data.length === 0) return null;

  const baseProduct = data[0] as Product;
  const { data: variants } = await supabase
    .from('products')
    .select('*')
    .eq('product_id', baseProduct.product_id)
    .eq('is_active', true);

  return {
    product: baseProduct,
    variants: (variants as Product[]) || [baseProduct],
  };
}
