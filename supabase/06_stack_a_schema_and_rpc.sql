-- =====================================================================
-- 06_stack_a_schema_and_rpc.sql
-- Complete Supabase Schema, RLS, and Atomic RPC Stored Procedure for Stack A
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Casual',
  collection TEXT,
  description TEXT,
  detailed_fabric TEXT,
  fabric TEXT NOT NULL DEFAULT 'Dubai Nida',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  offer_price NUMERIC(10, 2) CHECK (offer_price IS NULL OR offer_price >= 0),
  size TEXT NOT NULL CHECK (size IN ('L', 'XL', 'XXL', 'Free Size')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  length TEXT CHECK (length IS NULL OR length IN ('52"', '54"', '56"', '58"', '60"')),
  image1 TEXT,
  image2 TEXT,
  image3 TEXT,
  thumbnail TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_variant ON public.products (product_id, size, COALESCE(length, ''));
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- 3. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  utr_number TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid, Awaiting Confirmation' 
    CHECK (payment_status IN ('Paid, Awaiting Confirmation', 'Payment Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded')),
  payment_method TEXT NOT NULL DEFAULT 'UPI_QR_MANUAL',
  payment_proof_url TEXT,
  reservation_status TEXT NOT NULL DEFAULT 'reserved' 
    CHECK (reservation_status IN ('reserved', 'committed', 'released', 'expired')),
  reservation_expires_at TIMESTAMPTZ,
  restocked_at TIMESTAMPTZ,
  courier_name TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_utr ON public.orders(utr_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 4. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_variant_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size TEXT NOT NULL,
  length TEXT,
  price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (price_at_purchase >= 0),
  custom_measurements JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  min_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  expiry_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_percentage_limit CHECK (discount_type != 'percentage' OR (discount_value > 0 AND discount_value <= 100))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code ON public.coupons(UPPER(code));

-- 6. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SUBSCRIBERS
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscribers_email ON public.subscribers(LOWER(email));

-- 8. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read', 'Replied', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ADMINS
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public storefront access policies
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (approved = true OR public.is_admin());
CREATE POLICY "Public create reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public create messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public create subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public check valid coupons" ON public.coupons FOR SELECT USING (active = true);

-- Admin management policies
CREATE POLICY "Admin full products" ON public.products FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full order_items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full messages" ON public.messages FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin full subscribers" ON public.subscribers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin self read" ON public.admins FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- 11. ATOMIC ORDER SUBMISSION FUNCTION
CREATE OR REPLACE FUNCTION public.submit_manual_order(p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID := gen_random_uuid();
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC(10, 2) := 0;
  v_discount NUMERIC(10, 2) := 0;
  v_coupon_code TEXT;
  v_coupon RECORD;
  v_product RECORD;
  v_final_amount NUMERIC(10, 2);
BEGIN
  IF p_payload->>'customer_name' IS NULL OR p_payload->>'customer_phone' IS NULL OR p_payload->>'utr_number' IS NULL THEN
    RAISE EXCEPTION 'Customer Name, Phone, and UTR number are mandatory.';
  END IF;

  v_order_number := 'LC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 5));

  -- Verify each item against real database pricing and quantity
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    SELECT id, price, offer_price, quantity, name, slug
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_variant_id')::UUID AND is_active = true;

    IF v_product.id IS NULL THEN
      -- Fallback search by product_id if variant id not directly matched
      SELECT id, price, offer_price, quantity, name, slug
      INTO v_product
      FROM public.products
      WHERE product_id = (v_item->>'product_id') AND is_active = true
      LIMIT 1;
    END IF;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Item not available or out of stock.';
    END IF;

    IF v_product.quantity < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (COALESCE(v_product.offer_price, v_product.price) * (v_item->>'quantity')::INTEGER);
  END LOOP;

  -- Validate coupon if provided
  v_coupon_code := p_payload->>'coupon_code';
  IF v_coupon_code IS NOT NULL AND v_coupon_code != '' THEN
    SELECT * INTO v_coupon FROM public.coupons 
    WHERE UPPER(code) = UPPER(v_coupon_code) AND active = true 
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);

    IF v_coupon.id IS NOT NULL AND v_subtotal >= v_coupon.min_purchase THEN
      IF v_coupon.discount_type = 'percentage' THEN
        v_discount := ROUND((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
      ELSE
        v_discount := LEAST(v_coupon.discount_value, v_subtotal);
      END IF;
    END IF;
  END IF;

  v_final_amount := GREATEST(0, v_subtotal - v_discount);

  -- Insert order record
  INSERT INTO public.orders (
    id, order_number, customer_name, customer_email, customer_phone,
    shipping_address, total_amount, amount, discount_amount,
    items, utr_number, payment_proof_url, notes,
    payment_status, reservation_status
  ) VALUES (
    v_order_id, v_order_number,
    p_payload->>'customer_name', p_payload->>'customer_email', p_payload->>'customer_phone',
    p_payload->>'shipping_address', v_final_amount, v_subtotal, v_discount,
    p_payload->'items', p_payload->>'utr_number', p_payload->>'payment_proof_url', p_payload->>'notes',
    'Paid, Awaiting Confirmation', 'reserved'
  );

  -- Insert line items and decrement inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    SELECT id, price, offer_price, name, slug INTO v_product
    FROM public.products 
    WHERE id = (v_item->>'product_variant_id')::UUID;

    IF v_product.id IS NULL THEN
      SELECT id, price, offer_price, name, slug INTO v_product
      FROM public.products 
      WHERE product_id = (v_item->>'product_id')
      LIMIT 1;
    END IF;

    IF v_product.id IS NOT NULL THEN
      INSERT INTO public.order_items (
        order_id, product_id, product_variant_id, product_name, product_slug,
        quantity, size, length, price_at_purchase, custom_measurements
      ) VALUES (
        v_order_id,
        v_item->>'product_id',
        v_product.id,
        v_product.name,
        v_product.slug,
        (v_item->>'quantity')::INTEGER,
        COALESCE(v_item->>'size', 'Free Size'),
        v_item->>'length',
        COALESCE(v_product.offer_price, v_product.price),
        v_item->'custom_measurements'
      );

      UPDATE public.products
      SET quantity = GREATEST(0, quantity - (v_item->>'quantity')::INTEGER),
          updated_at = now()
      WHERE id = v_product.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order_number,
    'order_id', v_order_id,
    'total_amount', v_final_amount
  );
END;
$$;
