// =====================================================================
// src/types/database.ts
// Direct TypeScript Definitions for Supabase Relational Tables & Payloads
// =====================================================================

export interface Product {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  category: string;
  collection: string | null;
  description: string | null;
  detailed_fabric: string | null;
  fabric: string;
  price: number;
  original_price: number | null;
  offer_price: number | null;
  size: 'L' | 'XL' | 'XXL' | 'Free Size' | string;
  quantity: number;
  length: '52"' | '54"' | '56"' | '58"' | '60"' | null | string;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  thumbnail: string | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_flash_sale: boolean;
  is_active: boolean;
  care_instructions: string | null;
  includes_matching_sheila: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItemPayload {
  product_id: string;
  product_variant_id: string | null;
  product_name: string;
  quantity: number;
  size: string;
  length: string | null;
  custom_measurements?: Record<string, string | number> | null;
}

export interface CheckoutPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  utr_number: string;
  coupon_code?: string;
  payment_proof_url?: string;
  notes?: string;
  items: OrderItemPayload[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_purchase: number;
  expiry_date: string | null;
  active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  approved: boolean;
  verified_purchase: boolean;
  created_at: string;
}

export interface MessagePayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}
