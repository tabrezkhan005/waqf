-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's district_id
CREATE OR REPLACE FUNCTION public.get_user_district_id()
RETURNS int AS $$
BEGIN
  RETURN (SELECT district_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DISTRICTS POLICIES
-- ============================================
-- All authenticated users can read districts
CREATE POLICY "Anyone authenticated can view districts"
  ON public.districts
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete districts
CREATE POLICY "Only admins can manage districts"
  ON public.districts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can update their own profile (except role, district_id, device_id)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    district_id = (SELECT district_id FROM public.profiles WHERE id = auth.uid()) AND
    device_id = (SELECT device_id FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- INSTITUTIONS POLICIES
-- ============================================
-- Inspectors can view institutions in their district only
CREATE POLICY "Inspectors can view institutions in their district"
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'inspector' AND
    district_id = public.get_user_district_id()
  );

-- Accounts, Admin, Reports can view all institutions
CREATE POLICY "Accounts/Admin/Reports can view all institutions"
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Only admins can insert institutions
CREATE POLICY "Only admins can insert institutions"
  ON public.institutions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can update institutions
CREATE POLICY "Only admins can update institutions"
  ON public.institutions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete institutions
CREATE POLICY "Only admins can delete institutions"
  ON public.institutions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- COLLECTIONS POLICIES
-- ============================================
-- Inspectors can view their own collections
CREATE POLICY "Inspectors can view own collections"
  ON public.collections
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'inspector' AND
    inspector_id = auth.uid()
  );

-- Accounts, Admin, Reports can view all collections
CREATE POLICY "Accounts/Admin/Reports can view all collections"
  ON public.collections
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Inspectors can insert collections for their district
CREATE POLICY "Inspectors can insert collections in their district"
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'inspector' AND
    inspector_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.institutions
      WHERE id = institution_id
      AND district_id = public.get_user_district_id()
    )
  );

-- Inspectors can update their own collections only when status is pending
CREATE POLICY "Inspectors can update own pending collections"
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'inspector' AND
    inspector_id = auth.uid() AND
    status IN ('pending', 'sent_to_accounts')
  )
  WITH CHECK (
    inspector_id = auth.uid() AND
    status IN ('pending', 'sent_to_accounts')
  );

-- Accounts can update collections (status, challan fields, verification)
CREATE POLICY "Accounts can update collections"
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'accounts')
  WITH CHECK (
    public.get_user_role() = 'accounts' AND
    -- Prevent changing inspector_id or institution_id
    inspector_id = (SELECT inspector_id FROM public.collections WHERE id = collections.id) AND
    institution_id = (SELECT institution_id FROM public.collections WHERE id = collections.id)
  );

-- Admins can update all collections
CREATE POLICY "Admins can update all collections"
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete collections
CREATE POLICY "Only admins can delete collections"
  ON public.collections
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- RECEIPTS POLICIES
-- ============================================
-- Inspectors can view receipts for their own collections
CREATE POLICY "Inspectors can view own receipts"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'inspector' AND
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = receipts.collection_id
      AND inspector_id = auth.uid()
    )
  );

-- Accounts, Admin, Reports can view all receipts
CREATE POLICY "Accounts/Admin/Reports can view all receipts"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Inspectors can insert receipts for their own collections
CREATE POLICY "Inspectors can insert receipts for own collections"
  ON public.receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'inspector' AND
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = receipts.collection_id
      AND inspector_id = auth.uid()
    )
  );

-- Only admins can update/delete receipts
CREATE POLICY "Only admins can update receipts"
  ON public.receipts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete receipts"
  ON public.receipts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================
-- Only admins and reports can view audit logs
CREATE POLICY "Admins and Reports can view audit logs"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'reports')
  );

-- System can insert audit logs (via triggers/functions)
CREATE POLICY "System can insert audit logs"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs
-- (No policies needed - default deny)




