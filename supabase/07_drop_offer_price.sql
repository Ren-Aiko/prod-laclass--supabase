-- =====================================================================
-- 07_drop_offer_price.sql
-- Preserves any active offer prices in products.price, then removes offer_price.
-- Run in Supabase SQL Editor after backing up the database.
-- =====================================================================

-- Keep the price previously used by checkout when an offer_price was set.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'offer_price'
  ) THEN
    UPDATE public.products
    SET price = offer_price
    WHERE offer_price IS NOT NULL;
  END IF;
END;
$$;

-- Replace the order RPC first so it no longer references offer_price.
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
  v_shipping_fee NUMERIC(10, 2) := 0;
  v_final_amount NUMERIC(10, 2);
BEGIN
  IF p_payload->>'customer_name' IS NULL OR p_payload->>'customer_phone' IS NULL OR p_payload->>'utr_number' IS NULL THEN
    RAISE EXCEPTION 'Customer Name, Phone, and UTR number are mandatory.';
  END IF;

  v_order_number := 'LC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 5));

  -- Verify each item against real database pricing and quantity.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    SELECT id, price, quantity, name, slug
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_variant_id')::UUID AND is_active = true;

    IF v_product.id IS NULL THEN
      SELECT id, price, quantity, name, slug
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

    v_subtotal := v_subtotal + (v_product.price * (v_item->>'quantity')::INTEGER);
  END LOOP;

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

  v_shipping_fee := CASE WHEN v_subtotal = 0 OR v_subtotal >= 5000 THEN 0 ELSE 250 END;
  v_final_amount := GREATEST(0, v_subtotal - v_discount + v_shipping_fee);

  INSERT INTO public.orders (
    id, order_number, customer_name, customer_email, customer_phone,
    shipping_address, total_amount, amount, discount_amount, shipping_fee,
    items, utr_number, payment_proof_url, notes,
    payment_status, reservation_status
  ) VALUES (
    v_order_id, v_order_number,
    p_payload->>'customer_name', p_payload->>'customer_email', p_payload->>'customer_phone',
    p_payload->>'shipping_address', v_final_amount, v_subtotal, v_discount, v_shipping_fee,
    p_payload->'items', p_payload->>'utr_number', p_payload->>'payment_proof_url', p_payload->>'notes',
    'Paid, Awaiting Confirmation', 'reserved'
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    SELECT id, price, name, slug INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_variant_id')::UUID;

    IF v_product.id IS NULL THEN
      SELECT id, price, name, slug INTO v_product
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
        v_product.price,
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
    'total_amount', v_final_amount,
    'shipping_fee', v_shipping_fee
  );
END;
$$;

ALTER TABLE public.products DROP COLUMN IF EXISTS offer_price;
