-- =====================================================================
-- Cloudflare D1 (SQLite) Schema Migration for LaClassé Haute Couture
-- Compatible with Cloudflare D1 Console & Wrangler CLI (`wrangler d1 execute`)
-- =====================================================================

-- 1. Products Table (Inventory & Size Management)
-- Individual records represent size variants sharing the same product_id and slug.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,                       -- e.g. 'prod_101_s' or unique row ID
  product_id TEXT NOT NULL,                  -- Group identifier shared across all size variants (e.g. 'LC-NOIR-01')
  name TEXT NOT NULL,
  slug TEXT NOT NULL,                        -- URL slug shared across all size rows of the same product_id (e.g. 'noir-dubai-abaya')
  category TEXT NOT NULL,                    -- e.g. 'Bridal', 'Premium', 'Casual', 'Luxury'
  collection TEXT,                           -- e.g. 'Noir Royal'
  description TEXT,
  detailed_fabric TEXT,
  fabric TEXT NOT NULL,                      -- e.g. 'Dubai Nida', 'Indonesian Zoom'
  price REAL NOT NULL,                       -- Current selling price
  original_price REAL,                       -- Original / offer price
  size TEXT NOT NULL,                        -- Allowed values: 'S', 'M', 'L', 'XL', '2XL', or 'Custom'
  quantity INTEGER DEFAULT 0,                -- Stock level for standard sizes; NULL or 9999 for 'Custom'
  length TEXT,                               -- e.g. '52"', '54"', '56"', '58"', '60"'
  image1 TEXT,                               -- Primary product image URL
  image2 TEXT,                               -- Angle / detail shot URL
  image3 TEXT,                               -- Model / close-up shot URL
  thumbnail TEXT,
  is_featured INTEGER DEFAULT 0,
  is_new_arrival INTEGER DEFAULT 0,
  is_flash_sale INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  care_instructions TEXT,
  includes_matching_sheila INTEGER DEFAULT 1,
  rating REAL DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Backward-compatibility column migrations for existing D1 databases:
-- SQLite ignores duplicate column errors if executed conditionally or safely.
-- ALTER TABLE products ADD COLUMN product_id TEXT;
-- ALTER TABLE products ADD COLUMN original_price REAL;

-- 2. Orders Table (Updated with UTR / Transaction Reference)
-- Status Lifecycle strictly follows:
-- 1. 'Paid, Awaiting Confirmation' (Automatically set upon checkout with customer UTR)
-- 2. 'Payment Confirmed'           (Updated manually by Admin checking bank credits against UTR)
-- 3. 'Shipped'                     (Updated manually by Admin, requires courier_name & tracking_number)
-- 4. 'Delivered'                   (Updated manually by Admin)
-- 5. 'Cancelled' / 'Refunded'      (Auto-restores inventory in worker)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                       -- e.g. 'LC-2026-8942'
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount REAL NOT NULL,                -- Grand total
  amount REAL,                               -- Subtotal
  discount_amount REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  items TEXT NOT NULL,                       -- JSON string storing items, sizes, custom measurements, and quantities
  utr_number TEXT NOT NULL,                  -- 12+ digit UTR/Transaction reference entered by customer
  payment_status TEXT NOT NULL DEFAULT 'Paid, Awaiting Confirmation',
  payment_proof_url TEXT,                    -- Optional / nullable for historical compatibility
  payment_method TEXT DEFAULT 'UPI_QR_MANUAL',
  courier_name TEXT,
  tracking_number TEXT,
  reservation_status TEXT DEFAULT 'reserved', -- 'reserved', 'committed', 'released', 'expired'
  reservation_expires_at DATETIME,           -- UTC expiry (30 min after checkout)
  restocked_at DATETIME,                     -- Explicit restock timestamp
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_reservation_status ON orders(reservation_status);
CREATE INDEX IF NOT EXISTS idx_orders_utr ON orders(utr_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 3. Order Items Table (Relational breakout for reporting)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,                       -- e.g. 'item_12345'
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_variant_id TEXT,                   -- NULL for custom items
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT NOT NULL,                        -- 'XS', 'S', 'M', 'L', 'XL', '2XL', 'Free Size', or 'Custom'
  length TEXT,                               -- NULL for custom items
  price_at_purchase REAL NOT NULL,
  custom_measurements TEXT DEFAULT NULL,     -- JSON string with bespoke inputs (Chest, Hip, Abaya Length, Height, Sleeve Length from Neck) if size == 'Custom'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 4. Operational Tables (Coupons, Reviews, Subscribers, Contact Messages)
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'flat'
  discount_value REAL NOT NULL,
  min_purchase REAL DEFAULT 0,
  expiry_date TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  review_text TEXT,
  approved INTEGER DEFAULT 0,
  verified_purchase INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed coupon
INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_purchase, expiry_date, active)
VALUES ('WELCOME10', 'percentage', 10, 0, '2026-12-31', 1);
