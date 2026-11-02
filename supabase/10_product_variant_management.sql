-- Keep product images in image1/image2/image3 and derive the primary image
-- from image1 instead of maintaining a separate thumbnail column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'thumbnail'
  ) THEN
    EXECUTE 'UPDATE public.products
      SET image1 = COALESCE(image1, thumbnail)
      WHERE image1 IS NULL AND thumbnail IS NOT NULL';
  END IF;
END;
$$;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS badge,
  DROP COLUMN IF EXISTS thumbnail,
  DROP CONSTRAINT IF EXISTS products_size_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_size_check
  CHECK (size IN ('L', 'XL', 'XXL', 'Free Size', 'Custom'));

ALTER TABLE public.products
  ALTER COLUMN is_new_arrival SET DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_variant
  ON public.products (product_id, size, COALESCE(length, ''));

CREATE OR REPLACE FUNCTION public.admin_save_product(
  p_product JSONB,
  p_variants JSONB,
  p_is_new BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id TEXT := NULLIF(BTRIM(p_product->>'product_id'), '');
  v_saved JSONB;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted product service may save garments';
  END IF;

  IF v_product_id IS NULL OR NULLIF(BTRIM(p_product->>'name'), '') IS NULL THEN
    RAISE EXCEPTION 'Product ID and name are required';
  END IF;

  IF jsonb_typeof(p_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'At least one product variant is required';
  END IF;
  IF jsonb_array_length(p_variants) = 0 THEN
    RAISE EXCEPTION 'At least one product variant is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_product_id, 0));

  IF p_is_new AND EXISTS (
    SELECT 1 FROM public.products WHERE product_id = v_product_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Product ID is already in use';
  ELSIF NOT p_is_new AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE product_id = v_product_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Product no longer exists';
  END IF;

  INSERT INTO public.products (
    product_id, name, slug, category, collection, description, fabric,
    price, original_price, size, length, quantity, image1, image2, image3,
    is_featured, is_new_arrival, is_flash_sale, is_active, updated_at
  )
  SELECT
    v_product_id,
    BTRIM(p_product->>'name'),
    p_product->>'slug',
    p_product->>'category',
    p_product->>'collection',
    p_product->>'description',
    p_product->>'fabric',
    (p_product->>'price')::NUMERIC,
    NULLIF(p_product->>'original_price', '')::NUMERIC,
    variant.size,
    NULLIF(variant.length, ''),
    variant.quantity,
    NULLIF(p_product->>'image1', ''),
    NULLIF(p_product->>'image2', ''),
    NULLIF(p_product->>'image3', ''),
    (p_product->>'is_featured')::BOOLEAN,
    (p_product->>'is_new_arrival')::BOOLEAN,
    (p_product->>'is_flash_sale')::BOOLEAN,
    (p_product->>'is_active')::BOOLEAN,
    now()
  FROM jsonb_to_recordset(p_variants) AS variant(
    size TEXT,
    length TEXT,
    quantity INTEGER
  )
  ON CONFLICT (product_id, size, (COALESCE(length, ''::TEXT)))
  DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    category = EXCLUDED.category,
    collection = EXCLUDED.collection,
    description = EXCLUDED.description,
    fabric = EXCLUDED.fabric,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    quantity = EXCLUDED.quantity,
    image1 = EXCLUDED.image1,
    image2 = EXCLUDED.image2,
    image3 = EXCLUDED.image3,
    is_featured = EXCLUDED.is_featured,
    is_new_arrival = EXCLUDED.is_new_arrival,
    is_flash_sale = EXCLUDED.is_flash_sale,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  DELETE FROM public.products AS product
  WHERE product.product_id = v_product_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_variants) AS variant(size TEXT, length TEXT)
      WHERE variant.size = product.size
        AND COALESCE(NULLIF(variant.length, ''), '') = COALESCE(product.length, '')
    );

  SELECT COALESCE(
    jsonb_agg(to_jsonb(product) ORDER BY product.size, product.length),
    '[]'::JSONB
  )
  INTO v_saved
  FROM public.products AS product
  WHERE product.product_id = v_product_id;

  RETURN v_saved;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_product(JSONB, JSONB, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(JSONB, JSONB, BOOLEAN)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted product service may delete garments';
  END IF;
  IF NULLIF(BTRIM(p_product_id), '') IS NULL THEN
    RAISE EXCEPTION 'Product ID is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id, 0));
  DELETE FROM public.products WHERE product_id = p_product_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_product(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(TEXT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
