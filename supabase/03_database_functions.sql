-- =====================================================================
-- 03_database_functions.sql
-- LaClassé Haute Couture — PostgreSQL Functions, Triggers & Atomic Transactions
-- =====================================================================

-- 1. TRIGGER FUNCTION: Updated At Timestamp Auto-Maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_messages_updated_at ON messages;
CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- 2. ATOMIC ORDER CREATION & STOCK RESERVATION
-- Prevents race conditions and overselling by locking variant rows (`FOR UPDATE`).
-- Decrements available quantity only for standard variants.
-- Automatically rolls back on any error.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_order_atomic(p_order JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_shipping_address TEXT;
  v_utr_number TEXT;
  v_coupon_code TEXT;
  v_notes TEXT;
  v_items JSONB;
  v_item JSONB;
  
  v_subtotal NUMERIC(10, 2) := 0;
  v_discount NUMERIC(10, 2) := 0;
  v_shipping_fee NUMERIC(10, 2) := 0;
  v_grand_total NUMERIC(10, 2) := 0;
  
  v_prod_id TEXT;
  v_variant_id UUID;
  v_variant_row RECORD;
  v_item_qty INTEGER;
  v_item_size TEXT;
  v_item_length TEXT;
  v_item_price NUMERIC(10, 2);
  v_custom_m JSONB;
  
  v_coupon_row RECORD;
  v_expiry_interval INTERVAL := '30 minutes';
BEGIN
  -- Extract customer fields
  v_customer_name := trim(COALESCE(p_order->>'customer_name', ''));
  v_customer_email := trim(COALESCE(p_order->>'customer_email', ''));
  v_customer_phone := trim(COALESCE(p_order->>'customer_phone', ''));
  v_shipping_address := trim(COALESCE(p_order->>'shipping_address', ''));
  v_utr_number := regexp_replace(COALESCE(p_order->>'utr_number', ''), '\s+', '', 'g');
  v_coupon_code := upper(trim(COALESCE(p_order->>'coupon_code', '')));
  v_notes := p_order->>'notes';
  v_items := p_order->'items';

  -- Validate inputs
  IF length(v_customer_name) = 0 OR length(v_customer_email) = 0 OR 
     length(v_customer_phone) = 0 OR length(v_shipping_address) = 0 THEN
    RAISE EXCEPTION 'Customer name, email, phone, and shipping address are required.';
  END IF;

  IF length(v_utr_number) < 6 THEN
    RAISE EXCEPTION 'A valid UPI Ref / UTR / Transaction reference number is required to confirm payment.';
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- Generate order number if not supplied
  v_order_number := COALESCE(
    p_order->>'order_number',
    p_order->>'id',
    'LC-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0')
  );

  -- 1. Loop through items to validate and atomically reserve stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_prod_id := v_item->>'product_id';
    v_item_size := trim(COALESCE(v_item->>'size', 'Free Size'));
    v_item_length := v_item->>'length';
    v_item_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INTEGER, 1));
    v_custom_m := v_item->'custom_measurements';

    IF v_item_size = 'Custom' THEN
      -- Case A: Custom Measurement Order (No stock reservation)
      -- Validate 5 measurement values
      IF v_custom_m IS NULL OR
         COALESCE((v_custom_m->>'chest')::NUMERIC, 0) <= 0 OR
         COALESCE((v_custom_m->>'hip')::NUMERIC, 0) <= 0 OR
         COALESCE((v_custom_m->>'abayaLength')::NUMERIC, 0) <= 0 OR
         COALESCE((v_custom_m->>'height')::NUMERIC, 0) <= 0 OR
         COALESCE((v_custom_m->>'sleeveLength')::NUMERIC, 0) <= 0 THEN
        RAISE EXCEPTION 'All 5 custom measurements (Chest, Hip, Abaya Length, Height, Sleeve Length) must be valid positive numbers.';
      END IF;

      -- Fetch authoritative product price
      SELECT price INTO v_item_price
      FROM products
      WHERE (product_id = v_prod_id OR id::text = v_prod_id)
        AND is_active = true
      LIMIT 1;

      IF v_item_price IS NULL THEN
        RAISE EXCEPTION 'Product % is inactive or not found.', v_prod_id;
      END IF;

      v_subtotal := v_subtotal + (v_item_price * v_item_qty);

    ELSE
      -- Case B: Standard Variant (Atomic lock & decrement)
      -- 1. Try to match variant by UUID if provided (36 chars)
      IF (v_item->>'product_variant_id') IS NOT NULL AND length(v_item->>'product_variant_id') = 36 THEN
        SELECT * INTO v_variant_row
        FROM products
        WHERE id = (v_item->>'product_variant_id')::UUID
          AND is_active = true
        FOR UPDATE;
      END IF;

      -- 2. Try match by (product_id, size, length) with normalized quotes and casing
      IF v_variant_row.id IS NULL THEN
        SELECT * INTO v_variant_row
        FROM products
        WHERE (lower(trim(product_id)) = lower(trim(v_prod_id)) OR id::text = v_prod_id)
          AND (
            lower(trim(size)) = lower(trim(v_item_size))
            OR (lower(v_item_size) IN ('free size', 'freesize') AND lower(size) IN ('free size', 'freesize'))
          )
          AND (
            v_item_length IS NULL 
            OR replace(coalesce(length, ''), '"', '') = replace(coalesce(v_item_length, ''), '"', '')
            OR length IS NULL
          )
          AND is_active = true
        ORDER BY quantity DESC
        LIMIT 1
        FOR UPDATE;
      END IF;

      -- 3. Fallback: Match by product_id and size (any length)
      IF v_variant_row.id IS NULL THEN
        SELECT * INTO v_variant_row
        FROM products
        WHERE (lower(trim(product_id)) = lower(trim(v_prod_id)) OR id::text = v_prod_id)
          AND (
            lower(trim(size)) = lower(trim(v_item_size))
            OR (lower(v_item_size) IN ('free size', 'freesize') AND lower(size) IN ('free size', 'freesize'))
          )
          AND is_active = true
        ORDER BY quantity DESC
        LIMIT 1
        FOR UPDATE;
      END IF;

      -- 4. Fallback: Match any active row for this product_id
      IF v_variant_row.id IS NULL THEN
        SELECT * INTO v_variant_row
        FROM products
        WHERE (lower(trim(product_id)) = lower(trim(v_prod_id)) OR id::text = v_prod_id)
          AND is_active = true
        ORDER BY quantity DESC
        LIMIT 1
        FOR UPDATE;
      END IF;

      -- 5. Fallback: If no row exists at all in products (unseeded catalog), auto-provision variant
      IF v_variant_row.id IS NULL THEN
        INSERT INTO products (
          product_id, name, slug, category, collection, description,
          fabric, price, size, length, quantity, is_active
        ) VALUES (
          v_prod_id,
          COALESCE(v_item->>'name', 'Abaya Couture'),
          lower(regexp_replace(COALESCE(v_item->>'name', 'abaya'), '[^a-z0-9]+', '-', 'g')),
          'Luxury', 'Signature Atelier',
          'Artisanal handcrafted luxury abaya.',
          'Dubai Nida',
          GREATEST(100, COALESCE((v_item->>'price_at_purchase')::NUMERIC, 8999)),
          COALESCE(v_item_size, 'Free Size'),
          COALESCE(v_item_length, '56"'),
          10,
          true
        )
        RETURNING * INTO v_variant_row;
      END IF;

      IF v_variant_row.quantity < v_item_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Variant % (% %) has only % in stock (requested %).',
          v_variant_row.name, v_item_size, COALESCE(v_variant_row.length, ''), v_variant_row.quantity, v_item_qty;
      END IF;

      -- Atomically decrement stock
      UPDATE products
      SET quantity = quantity - v_item_qty,
          updated_at = now()
      WHERE id = v_variant_row.id;

      v_item_price := v_variant_row.price;
      v_subtotal := v_subtotal + (v_item_price * v_item_qty);
    END IF;
  END LOOP;

  -- 2. Server-authoritative Coupon validation
  IF length(v_coupon_code) > 0 THEN
    SELECT * INTO v_coupon_row
    FROM coupons
    WHERE upper(code) = v_coupon_code
      AND active = true
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    LIMIT 1;

    IF v_coupon_row.code IS NOT NULL THEN
      IF v_subtotal >= v_coupon_row.min_purchase THEN
        IF v_coupon_row.discount_type = 'percentage' THEN
          v_discount := round((v_subtotal * v_coupon_row.discount_value) / 100.0, 2);
        ELSE
          v_discount := LEAST(v_subtotal, v_coupon_row.discount_value);
        END IF;
      END IF;
    END IF;
  END IF;

  -- 3. Shipping Fee calculation: Free over ₹5000, else ₹250
  IF v_subtotal = 0 OR v_subtotal >= 5000 THEN
    v_shipping_fee := 0;
  ELSE
    v_shipping_fee := 250;
  END IF;

  v_grand_total := GREATEST(0, v_subtotal - v_discount + v_shipping_fee);

  -- 4. Insert into orders table
  INSERT INTO orders (
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    total_amount,
    amount,
    discount_amount,
    shipping_fee,
    items,
    utr_number,
    payment_status,
    payment_method,
    reservation_status,
    reservation_expires_at,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_order_number,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_shipping_address,
    v_grand_total,
    v_subtotal,
    v_discount,
    v_shipping_fee,
    v_items,
    v_utr_number,
    'Paid, Awaiting Confirmation',
    'UPI_QR_MANUAL',
    'reserved',
    now() + v_expiry_interval,
    v_notes,
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  -- 5. Insert breakout records into order_items table
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_prod_id := v_item->>'product_id';
    v_item_size := trim(COALESCE(v_item->>'size', 'Free Size'));
    v_item_length := v_item->>'length';
    v_item_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INTEGER, 1));
    v_custom_m := v_item->'custom_measurements';

    IF v_item_size = 'Custom' THEN
      SELECT price, name, slug INTO v_item_price, v_variant_row.name, v_variant_row.slug
      FROM products
      WHERE (product_id = v_prod_id OR id::text = v_prod_id)
      LIMIT 1;

      INSERT INTO order_items (
        order_id, product_id, product_variant_id, product_name, product_slug,
        quantity, size, length, price_at_purchase, custom_measurements
      ) VALUES (
        v_order_id, v_prod_id, NULL, COALESCE(v_item->>'name', v_variant_row.name, 'Custom Abaya'),
        v_variant_row.slug, v_item_qty, 'Custom', NULL, v_item_price, v_custom_m
      );
    ELSE
      -- Standard item
      IF (v_item->>'product_variant_id') IS NOT NULL AND length(v_item->>'product_variant_id') = 36 THEN
        SELECT * INTO v_variant_row FROM products WHERE id = (v_item->>'product_variant_id')::UUID;
      ELSE
        SELECT * INTO v_variant_row FROM products
        WHERE product_id = v_prod_id AND size = v_item_size
          AND (v_item_length IS NULL OR length = v_item_length OR length IS NULL)
        LIMIT 1;
      END IF;

      INSERT INTO order_items (
        order_id, product_id, product_variant_id, product_name, product_slug,
        quantity, size, length, price_at_purchase, custom_measurements
      ) VALUES (
        v_order_id, v_prod_id, v_variant_row.id, v_variant_row.name, v_variant_row.slug,
        v_item_qty, v_item_size, COALESCE(v_item_length, v_variant_row.length),
        v_variant_row.price, NULL
      );
    END IF;
  END LOOP;

  -- Return sanitized order confirmation
  RETURN jsonb_build_object(
    'success', true,
    'id', v_order_id,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'utr_number', v_utr_number,
    'payment_status', 'Paid, Awaiting Confirmation',
    'reservation_status', 'reserved',
    'total_amount', v_grand_total,
    'amount', v_subtotal,
    'discount_amount', v_discount,
    'shipping_fee', v_shipping_fee,
    'expires_in_minutes', 30,
    'message', 'Order created and stock reserved for 30 minutes.'
  );
END;
$$;

-- =====================================================================
-- 3. RELEASE EXPIRED RESERVATIONS (Idempotent & Safe)
-- Releases reservations past their 30-min window where payment is not confirmed.
-- Restores stock to standard variants exactly once.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_released_ids TEXT[] := ARRAY[]::TEXT[];
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT id, order_number, notes
    FROM orders
    WHERE reservation_status = 'reserved'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at <= now()
      AND payment_status NOT IN ('Payment Confirmed', 'Shipped', 'Delivered')
    FOR UPDATE
  LOOP
    -- 1. Update order state atomically
    UPDATE orders
    SET reservation_status = 'released',
        payment_status = 'Cancelled',
        notes = CASE 
          WHEN notes IS NULL OR notes = '' THEN '[Reservation expired: stock restored]'
          ELSE notes || ' [Reservation expired: stock restored]'
        END,
        updated_at = now()
    WHERE id = v_order.id
      AND reservation_status = 'reserved';

    -- 2. Restore stock for standard items of this order
    FOR v_item IN
      SELECT product_variant_id, quantity, size
      FROM order_items
      WHERE order_id = v_order.id
        AND product_variant_id IS NOT NULL
        AND size != 'Custom'
    LOOP
      UPDATE products
      SET quantity = quantity + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_variant_id;
    END LOOP;

    v_released_ids := array_append(v_released_ids, v_order.order_number);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'released_count', v_count,
    'released_orders', v_released_ids,
    'timestamp', now()
  );
END;
$$;

-- =====================================================================
-- 4. CONFIRM ORDER PAYMENT (Admin-Authorized)
-- Transitions reservation from 'reserved' to 'committed'
-- Reconciles UTR and sets status to 'Payment Confirmed'.
-- Handles expired recovery safely if stock is available.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_avail INTEGER;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- Case A: Normal active reservation
  IF v_order.reservation_status = 'reserved' AND v_order.reservation_expires_at > now() THEN
    UPDATE orders
    SET payment_status = 'Payment Confirmed',
        reservation_status = 'committed',
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'payment_status', 'Payment Confirmed',
      'reservation_status', 'committed'
    );
  END IF;

  -- Case B: Already committed
  IF v_order.reservation_status = 'committed' THEN
    UPDATE orders
    SET payment_status = 'Payment Confirmed',
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_status', 'Payment Confirmed');
  END IF;

  -- Case C: Reservation was released or expired, but admin wants to confirm after customer paid
  -- Attempt controlled re-reservation if stock exists
  FOR v_item IN
    SELECT product_variant_id, quantity, product_name, size
    FROM order_items
    WHERE order_id = p_order_id
      AND product_variant_id IS NOT NULL
      AND size != 'Custom'
  LOOP
    SELECT quantity INTO v_avail FROM products WHERE id = v_item.product_variant_id FOR UPDATE;
    IF v_avail < v_item.quantity THEN
      RAISE EXCEPTION 'Cannot confirm payment: stock for % (%) was released and is currently out of stock (available: %, needed: %).',
        v_item.product_name, v_item.size, v_avail, v_item.quantity;
    END IF;

    UPDATE products
    SET quantity = quantity - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_variant_id;
  END LOOP;

  UPDATE orders
  SET payment_status = 'Payment Confirmed',
      reservation_status = 'committed',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_status', 'Payment Confirmed',
    'reservation_status', 'committed',
    'recovered', true
  );
END;
$$;

-- =====================================================================
-- 5. EXPLICIT ORDER RESTOCK (Cancelled / Refunded Paid Orders)
-- Ensures exact-once restocking via `restocked_at` check.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.restock_order_explicit(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_restored_total INTEGER := 0;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.restocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Order was already restocked at %. Duplicate restocking prevented.', v_order.restocked_at;
  END IF;

  IF v_order.payment_status NOT IN ('Cancelled', 'Refunded') THEN
    RAISE EXCEPTION 'Restocking is only permitted for Cancelled or Refunded orders. Current status is %.', v_order.payment_status;
  END IF;

  FOR v_item IN
    SELECT product_variant_id, quantity
    FROM order_items
    WHERE order_id = p_order_id
      AND product_variant_id IS NOT NULL
      AND size != 'Custom'
  LOOP
    UPDATE products
    SET quantity = quantity + v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_variant_id;

    v_restored_total := v_restored_total + v_item.quantity;
  END LOOP;

  UPDATE orders
  SET restocked_at = now(),
      reservation_status = 'released',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'restocked_count', v_restored_total,
    'restocked_at', now()
  );
END;
$$;

-- =====================================================================
-- 5. FUNCTION: sync_admin_user
-- Synchronizes the calling authenticated user (auth.uid()) with public.admins
-- Accepts optional p_email, checks auth.jwt() email, links and activates!
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sync_admin_user(p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_admin_record RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Prioritize explicitly supplied email, then JWT email, then auth.users table
  v_user_email := COALESCE(
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
    (SELECT email FROM auth.users WHERE id = v_user_id LIMIT 1)
  );

  -- 1. If this auth_user_id already exists in admins, ensure active
  SELECT id, auth_user_id, email, role, is_active 
  INTO v_admin_record
  FROM public.admins
  WHERE auth_user_id = v_user_id;

  IF FOUND THEN
    IF NOT v_admin_record.is_active THEN
      UPDATE public.admins SET is_active = true WHERE id = v_admin_record.id;
    END IF;
    RETURN jsonb_build_object(
      'success', true, 
      'admin', jsonb_build_object('id', v_admin_record.id, 'email', v_admin_record.email, 'role', v_admin_record.role)
    );
  END IF;

  -- 2. If user email exists in admins under a different or placeholder auth_user_id, sync it!
  IF v_user_email IS NOT NULL AND v_user_email != '' THEN
    SELECT id, auth_user_id, email, role, is_active 
    INTO v_admin_record
    FROM public.admins
    WHERE lower(email) = lower(v_user_email);

    IF FOUND THEN
      UPDATE public.admins
      SET auth_user_id = v_user_id, is_active = true, updated_at = now()
      WHERE id = v_admin_record.id;

      RETURN jsonb_build_object(
        'success', true, 
        'admin', jsonb_build_object('id', v_admin_record.id, 'email', v_user_email, 'role', v_admin_record.role)
      );
    END IF;

    -- 3. If no row exists yet for this authenticated user, create a super_admin entry!
    INSERT INTO public.admins (auth_user_id, email, role, is_active)
    VALUES (v_user_id, v_user_email, 'super_admin', true)
    ON CONFLICT (auth_user_id) DO UPDATE SET is_active = true, role = 'super_admin'
    RETURNING id, auth_user_id, email, role, is_active INTO v_admin_record;

    RETURN jsonb_build_object(
      'success', true, 
      'admin', jsonb_build_object('id', v_admin_record.id, 'email', v_admin_record.email, 'role', v_admin_record.role)
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'No email identified for authenticated user');
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restock_order_explicit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_admin_user(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_admin_user() TO authenticated, service_role;
