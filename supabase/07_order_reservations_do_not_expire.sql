-- Customer orders are created after checkout and stock has already been
-- reserved. Do not expire those reservations while payment is reconciled.
CREATE OR REPLACE FUNCTION public.keep_order_reservations_until_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reservation_status = 'reserved'
     AND NEW.payment_status = 'Paid, Awaiting Confirmation' THEN
    NEW.reservation_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_reservations_do_not_expire ON public.orders;
CREATE TRIGGER trg_order_reservations_do_not_expire
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.keep_order_reservations_until_resolved();

-- Preserve stock held for orders still awaiting payment reconciliation.
UPDATE public.orders
SET reservation_expires_at = NULL
WHERE reservation_status = 'reserved'
  AND payment_status = 'Paid, Awaiting Confirmation'
  AND reservation_expires_at IS NOT NULL;

-- A reserved order already has inventory deducted at order creation. Its
-- reservation remains valid until confirmed or cancelled, regardless of age.
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

  IF v_order.reservation_status = 'reserved' THEN
    UPDATE orders
    SET payment_status = 'Payment Confirmed',
        reservation_status = 'committed',
        reservation_expires_at = NULL,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'payment_status', 'Payment Confirmed',
      'reservation_status', 'committed'
    );
  END IF;

  IF v_order.reservation_status = 'committed' THEN
    UPDATE orders
    SET payment_status = 'Payment Confirmed',
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'payment_status', 'Payment Confirmed'
    );
  END IF;

  -- Legacy released reservations must be re-reserved only if stock is available.
  FOR v_item IN
    SELECT product_variant_id, quantity, product_name, size
    FROM order_items
    WHERE order_id = p_order_id
      AND product_variant_id IS NOT NULL
      AND size != 'Custom'
  LOOP
    SELECT quantity INTO v_avail
    FROM products
    WHERE id = v_item.product_variant_id
    FOR UPDATE;

    IF v_avail IS NULL OR v_avail < v_item.quantity THEN
      RAISE EXCEPTION 'Cannot confirm payment: stock for % (%) was released and is currently out of stock (available: %, needed: %).',
        v_item.product_name, v_item.size, COALESCE(v_avail, 0), v_item.quantity;
    END IF;

    UPDATE products
    SET quantity = quantity - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_variant_id;
  END LOOP;

  UPDATE orders
  SET payment_status = 'Payment Confirmed',
      reservation_status = 'committed',
      reservation_expires_at = NULL,
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
