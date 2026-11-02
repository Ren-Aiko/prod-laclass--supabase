-- Add subscriber association for newsletter-generated coupons on existing projects.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS subscriber_email TEXT;

-- Keep coupon codes case-insensitively unique for both the admin panel and newsletter flow.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code ON public.coupons (UPPER(code));

-- Enforce one newsletter welcome coupon per subscriber, including concurrent signups.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_subscriber_email
  ON public.coupons (LOWER(subscriber_email))
  WHERE subscriber_email IS NOT NULL;
