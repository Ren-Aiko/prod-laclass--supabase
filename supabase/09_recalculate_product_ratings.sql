-- Allow products with no approved customer reviews to have a 0.0 rating.
ALTER TABLE public.products ALTER COLUMN rating SET DEFAULT 0.0;

DO $$
DECLARE
  rating_check RECORD;
BEGIN
  FOR rating_check IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%rating%'
      AND pg_get_constraintdef(oid) ILIKE '%>= 1%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', rating_check.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_rating_range_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_rating_range_check CHECK (rating >= 0 AND rating <= 5);
  END IF;
END;
$$;

-- Recalculate each product group from approved reviews only. Existing review
-- product_id values may be the group's product code or a specific variant UUID.
UPDATE public.products AS product
SET rating = COALESCE(approved.avg_rating, 0),
    review_count = COALESCE(approved.review_count, 0)
FROM (
  SELECT
    product_group.product_id,
    ROUND(AVG(review.rating)::numeric, 2) AS avg_rating,
    COUNT(DISTINCT review.id)::integer AS review_count
  FROM (SELECT DISTINCT product_id FROM public.products) AS product_group
  LEFT JOIN public.reviews AS review
    ON review.approved = true
   AND (
     review.product_id = product_group.product_id
     OR EXISTS (
       SELECT 1
       FROM public.products AS variant
       WHERE variant.product_id = product_group.product_id
         AND variant.id::text = review.product_id
     )
   )
  GROUP BY product_group.product_id
) AS approved
WHERE product.product_id = approved.product_id;
