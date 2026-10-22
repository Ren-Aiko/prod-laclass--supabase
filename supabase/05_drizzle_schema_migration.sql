-- =====================================================================
-- 05_drizzle_schema_migration.sql
-- Relational Table Blueprint Migration (Drizzle ORM Schema Specification)
-- Run this in Supabase SQL Editor to provision or align tables
-- =====================================================================

-- 1. Create order_status enum if not existing
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending_verification', 'confirmed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. ADMINS TABLE
-- [id (uuid, pk), email (text, unique), created_at]
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure columns exist
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- 3. PRODUCTS TABLE
-- [id (uuid, pk), name (text), description (text), price (numeric),
--  image_1 (text), image_2 (text), image_3 (text),
--  selected_variants (text[] - size arrays like ['S', 'M', 'L', 'XL']),
--  is_active (boolean, default true), created_at]
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 8999.00,
  image_1 TEXT,
  image_2 TEXT,
  image_3 TEXT,
  selected_variants TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_1 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_2 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_3 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selected_variants TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Sync image_1/image1 if needed
UPDATE public.products SET image_1 = COALESCE(image_1, image1, thumbnail) WHERE image_1 IS NULL;
UPDATE public.products SET image_2 = COALESCE(image_2, image2) WHERE image_2 IS NULL;
UPDATE public.products SET image_3 = COALESCE(image_3, image3) WHERE image_3 IS NULL;
UPDATE public.products SET selected_variants = ARRAY['S', 'M', 'L', 'XL'] WHERE selected_variants IS NULL;

-- 4. ORDERS TABLE
-- [id (uuid, pk), customer_name (text), customer_email (text),
--  shipping_address (text), total_amount (numeric), utr_number (text, unique),
--  status (enum: 'pending_verification', 'confirmed', 'rejected', default 'pending_verification'),
--  coupon_used (text, nullable), created_at]
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  utr_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  coupon_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_verification';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_used TEXT;

-- 5. ORDER_ITEMS TABLE
-- [id (uuid, pk), order_id (fk references orders.id on delete cascade),
--  product_id (fk references products.id), selected_size (text),
--  quantity (integer), price_at_purchase (numeric)]
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  selected_size TEXT NOT NULL DEFAULT 'M',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_size TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10, 2) DEFAULT 0.00;

-- 6. MESSAGES TABLE
-- [id (uuid, pk), name (text), email (text), body (text), created_at]
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS body TEXT;
UPDATE public.messages SET body = COALESCE(body, message) WHERE body IS NULL;

-- 7. REVIEWS TABLE
-- [id (uuid, pk), customer_name (text), rating (integer), comment (text),
--  is_approved (boolean, default false), created_at]
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
UPDATE public.reviews SET is_approved = COALESCE(is_approved, approved, false) WHERE is_approved IS NULL;

-- 8. SUBSCRIBERS TABLE
-- [id (uuid, pk), email (text, unique), created_at]
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. COUPONS TABLE
-- [id (uuid, pk), code (text, unique), discount_percent (integer),
--  is_used (boolean, default false), assigned_to_email (text, nullable), created_at]
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assigned_to_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 10;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS assigned_to_email TEXT;

-- 10. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow public read of active products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = true);

-- Allow public read of approved reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews" ON public.reviews
  FOR SELECT USING (is_approved = true);

-- Allow public insertion of reviews
DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
CREATE POLICY "Public can submit reviews" ON public.reviews
  FOR INSERT WITH CHECK (true);

-- Allow public insertion of contact messages
DROP POLICY IF EXISTS "Public can submit messages" ON public.messages;
CREATE POLICY "Public can submit messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Allow public insertion of newsletter subscribers
DROP POLICY IF EXISTS "Public can subscribe" ON public.subscribers;
CREATE POLICY "Public can subscribe" ON public.subscribers
  FOR INSERT WITH CHECK (true);

-- Allow public coupon lookup by code
DROP POLICY IF EXISTS "Public can lookup coupons" ON public.coupons;
CREATE POLICY "Public can lookup coupons" ON public.coupons
  FOR SELECT USING (is_used = false);

-- Allow public checkout order insertion
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);
