-- Prevent self-provisioning or privilege escalation through the admin RPC.
CREATE OR REPLACE FUNCTION public.sync_admin_user(p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, email, role, is_active
  INTO v_admin_record
  FROM public.admins
  WHERE auth_user_id = auth.uid()
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active administrator account is linked to this user');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'admin', jsonb_build_object(
      'id', v_admin_record.id,
      'email', v_admin_record.email,
      'role', v_admin_record.role,
      'is_active', v_admin_record.is_active
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_admin_user(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_admin_user(TEXT) TO authenticated, service_role;

-- Only an existing active super administrator may manage admin accounts.
CREATE OR REPLACE FUNCTION public.is_active_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_super_admin() TO authenticated, service_role;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admins'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.admins', v_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Admins can read own profile"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Super admins can manage admins"
  ON public.admins
  FOR ALL
  TO authenticated
  USING (public.is_active_super_admin())
  WITH CHECK (public.is_active_super_admin());

-- Sensitive SECURITY DEFINER RPCs are callable only from trusted Edge Functions.
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_order_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restock_order_explicit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.restock_order_explicit(UUID) TO service_role;
