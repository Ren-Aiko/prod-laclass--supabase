-- =====================================================================
-- 02_security_and_rls.sql
-- LaClassé Haute Couture — Row Level Security (RLS) Policies
-- =====================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL APPLICATION TABLES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. HELPER FUNCTION: Check if the calling JWT belongs to an active Admin
-- Security Definer with fixed search_path to prevent search-path injection
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Check if auth.uid() is in admins table with is_active = true
  RETURN EXISTS (
    SELECT 1 
    FROM public.admins 
    WHERE auth_user_id = auth.uid() 
      AND is_active = true
  );
END;
$$;

-- Revoke execute from public and grant to authenticated
REVOKE EXECUTE ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

-- =====================================================================
-- 3. PRODUCTS POLICIES
-- Public: Read only active products
-- Admin: Full CRUD on all products
-- =====================================================================
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all products" ON products;
CREATE POLICY "Admins can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 4. ORDERS & ORDER ITEMS POLICIES
-- Zero public access to orders or order items.
-- Privileged access restricted to authorized admins & Edge Functions.
-- =====================================================================
DROP POLICY IF EXISTS "Admins can view orders" ON orders;
CREATE POLICY "Admins can view orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
CREATE POLICY "Admins can delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can view order items" ON order_items;
CREATE POLICY "Admins can view order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 5. COUPONS POLICIES
-- Public: Read only active coupons
-- Admin: Full CRUD on coupons
-- =====================================================================
DROP POLICY IF EXISTS "Public can view active coupons" ON coupons;
CREATE POLICY "Public can view active coupons"
  ON coupons
  FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admins can view all coupons" ON coupons;
CREATE POLICY "Admins can view all coupons"
  ON coupons
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert coupons" ON coupons;
CREATE POLICY "Admins can insert coupons"
  ON coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
CREATE POLICY "Admins can update coupons"
  ON coupons
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;
CREATE POLICY "Admins can delete coupons"
  ON coupons
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 6. REVIEWS POLICIES
-- Public: Can view only approved reviews
-- Edge function / Public submit: Handled via submit-review Edge function
-- Admin: Full moderation rights
-- =====================================================================
DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;
CREATE POLICY "Public can view approved reviews"
  ON reviews
  FOR SELECT
  USING (approved = true);

DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
CREATE POLICY "Admins can view all reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
CREATE POLICY "Admins can update reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;
CREATE POLICY "Admins can delete reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 7. SUBSCRIBERS POLICIES
-- Public: Can insert newsletter subscriptions
-- Admin: Can view subscriber list
-- =====================================================================
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON subscribers;
CREATE POLICY "Public can subscribe to newsletter"
  ON subscribers
  FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

DROP POLICY IF EXISTS "Admins can view subscribers" ON subscribers;
CREATE POLICY "Admins can view subscribers"
  ON subscribers
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete subscribers" ON subscribers;
CREATE POLICY "Admins can delete subscribers"
  ON subscribers
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 8. CONTACT MESSAGES POLICIES
-- Public: Can insert new contact message. CANNOT view existing messages.
-- Admin: Full management rights
-- =====================================================================
DROP POLICY IF EXISTS "Public can submit contact messages" ON messages;
CREATE POLICY "Public can submit contact messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    name IS NOT NULL AND length(trim(name)) > 0 AND
    email IS NOT NULL AND length(trim(email)) > 3 AND
    message IS NOT NULL AND length(trim(message)) > 0
  );

DROP POLICY IF EXISTS "Admins can view contact messages" ON messages;
CREATE POLICY "Admins can view contact messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update contact messages" ON messages;
CREATE POLICY "Admins can update contact messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete contact messages" ON messages;
CREATE POLICY "Admins can delete contact messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- =====================================================================
-- 9. ADMINS TABLE POLICIES
-- Authenticated users can read and sync their own row by auth.uid() or JWT email.
-- No public read/write.
-- =====================================================================
DROP POLICY IF EXISTS "Admins can read own profile" ON admins;
CREATE POLICY "Admins can read own profile"
  ON admins
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Admins can update own profile" ON admins;
CREATE POLICY "Admins can update own profile"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    auth_user_id = auth.uid() 
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Super admins can manage admins" ON admins;
CREATE POLICY "Super admins can manage admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE (auth_user_id = auth.uid() OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        AND role = 'super_admin' 
        AND is_active = true
    )
  );
