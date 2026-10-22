-- =====================================================================
-- 01_reset_and_create_schema.sql
-- LaClassé Haute Couture — PostgreSQL Schema for Supabase
-- =====================================================================
-- WARNING: This is a DESTRUCTIVE RESET script.
-- Running this script will DROP existing LaClassé application tables
-- and recreate them cleanly. It does NOT touch Supabase auth.users
-- or system schemas.
-- =====================================================================

-- 1. DROP EXISTING APPLICATION TABLES IN DEPENDENCY-SAFE ORDER
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. PRODUCTS TABLE (Inventory & Multi-Variant Garment Model)
-- One row per purchasable variant. Variants of the same garment
-- share `product_id` group identifier and `slug`.
-- =====================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,                             -- Shared group identifier (e.g. 'LC001')
  name TEXT NOT NULL,                                   -- Garment display name
  slug TEXT NOT NULL,                                   -- SEO & URL slug shared across variants in group
  category TEXT NOT NULL DEFAULT 'Casual',              -- Luxury, Bridal, Premium, Casual
  collection TEXT,                                      -- e.g. 'Noir Royal'
  description TEXT,                                     -- Rich story & craftsmanship description
  detailed_fabric TEXT,                                 -- Technical fabric notes
  fabric TEXT NOT NULL DEFAULT 'Dubai Nida',            -- Primary fabric name
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),     -- Current selling price (INR)
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  offer_price NUMERIC(10, 2) CHECK (offer_price IS NULL OR offer_price >= 0),
  size TEXT NOT NULL CHECK (size IN ('L', 'XL', 'XXL', 'Free Size')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  length TEXT CHECK (length IS NULL OR length IN ('52"', '54"', '56"', '58"', '60"')),
  image1 TEXT,                                          -- Primary image (R2 key or public URL)
  image2 TEXT,                                          -- Secondary angle
  image3 TEXT,                                          -- Detail / model shot
  thumbnail TEXT,                                       -- Catalog thumbnail
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new_arrival BOOLEAN NOT NULL DEFAULT true,
  is_flash_sale BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  care_instructions TEXT,
  includes_matching_sheila BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for fast catalog browsing and variant lookup
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_active = true;
CREATE INDEX idx_products_active ON products(is_active);

-- Prevent duplicate variants for the same product group, size, and length
CREATE UNIQUE INDEX uq_products_variant ON products (
  product_id, 
  size, 
  COALESCE(length, '')
);

-- =====================================================================
-- 3. ORDERS TABLE
-- Tracks orders, customer delivery details, atomic UPI UTR payments,
-- reservation lifecycle, and courier tracking.
-- =====================================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,                    -- Human-readable order identifier (e.g. 'LC-2026-8942')
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0), -- Subtotal
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,             -- Snapshot of items for backward compatibility
  utr_number TEXT NOT NULL,                             -- Customer-submitted 12+ digit UPI UTR reference
  payment_status TEXT NOT NULL DEFAULT 'Paid, Awaiting Confirmation'
    CHECK (payment_status IN (
      'Paid, Awaiting Confirmation',
      'Payment Confirmed',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Refunded'
    )),
  payment_method TEXT NOT NULL DEFAULT 'UPI_QR_MANUAL',
  payment_proof_url TEXT,
  reservation_status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (reservation_status IN ('reserved', 'committed', 'released', 'expired')),
  reservation_expires_at TIMESTAMPTZ,                  -- 30 minutes after checkout creation
  restocked_at TIMESTAMPTZ,                            -- Timestamp of explicit authorized admin restock
  courier_name TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_reservation_status ON orders(reservation_status);
CREATE INDEX idx_orders_utr ON orders(utr_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- =====================================================================
-- 4. ORDER ITEMS TABLE (Relational Breakout)
-- Relational details per item purchased. Custom orders have size 'Custom',
-- length = NULL, product_variant_id = NULL, and custom_measurements JSONB.
-- =====================================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,                             -- Product group identifier
  product_variant_id UUID REFERENCES products(id) ON DELETE SET NULL, -- NULL for custom orders
  product_name TEXT NOT NULL,
  product_slug TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size TEXT NOT NULL,                                   -- 'L', 'XL', 'XXL', 'Free Size', or 'Custom'
  length TEXT,                                          -- NULL for custom orders
  price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (price_at_purchase >= 0),
  custom_measurements JSONB,                           -- Chest, Hip, Abaya Length, Height, Sleeve Length
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_variant ON order_items(product_variant_id);

-- =====================================================================
-- 5. COUPONS TABLE
-- Server-authoritative discounts. Either percentage OR flat discount, never both.
-- =====================================================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  min_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  expiry_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_percentage_limit CHECK (
    discount_type != 'percentage' OR (discount_value > 0 AND discount_value <= 100)
  )
);

CREATE UNIQUE INDEX uq_coupons_code ON coupons(UPPER(code));

-- =====================================================================
-- 6. REVIEWS TABLE
-- Product feedback. Logically refers to product group identifier.
-- Public users only see approved reviews.
-- =====================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,                             -- Shared garment identifier e.g. 'LC001'
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,              -- Must be explicitly approved by admin
  verified_purchase BOOLEAN NOT NULL DEFAULT false,     -- Set via server check or admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_approved ON reviews(approved);

-- =====================================================================
-- 7. SUBSCRIBERS TABLE
-- Newsletter audience. Unique case-insensitive emails.
-- =====================================================================
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_subscribers_email ON subscribers(LOWER(email));

-- =====================================================================
-- 8. MESSAGES TABLE
-- Concierge and contact inquiries.
-- =====================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read', 'Replied', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- =====================================================================
-- 9. ADMINS METADATA TABLE
-- Links Supabase Auth users (`auth.users.id`) to admin privileges.
-- No plaintext passwords or public signups.
-- =====================================================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admins_auth_user_id ON admins(auth_user_id);
CREATE INDEX idx_admins_active ON admins(is_active);

-- Initial default coupon for new store
INSERT INTO coupons (code, discount_type, discount_value, min_purchase, expiry_date, active)
VALUES ('WELCOME10', 'percentage', 10, 0, '2026-12-31', true)
ON CONFLICT DO NOTHING;
