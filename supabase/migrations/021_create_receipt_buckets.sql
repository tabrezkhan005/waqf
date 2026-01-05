-- ============================================
-- Receipt Storage Buckets Setup
-- ============================================
-- This migration creates storage policies for two separate buckets:
-- 1. 'receipt' - for bill receipts
-- 2. 'bank-receipt' - for bank/transaction receipts
--
-- Note: The buckets themselves must be created via Supabase Dashboard or CLI:
--   - Go to Storage > New bucket
--   - Name: receipt (for bill receipts)
--   - Name: bank-receipt (for transaction receipts)
--   - Public: false (private buckets)
--   - File size limit: 10MB (recommended)
--   - Allowed MIME types: image/* (recommended)

-- ============================================
-- STORAGE POLICIES FOR RECEIPT BUCKET (Bill Receipts)
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Inspectors can upload bill receipts" ON storage.objects;
DROP POLICY IF EXISTS "Inspectors can read own bill receipts" ON storage.objects;
DROP POLICY IF EXISTS "Accounts/Admin/Reports can read all bill receipts" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete bill receipts" ON storage.objects;

-- Inspectors can upload files to their own folder in receipt bucket
CREATE POLICY "Inspectors can upload bill receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipt' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inspectors can read files from their own folder
CREATE POLICY "Inspectors can read own bill receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipt' AND
    (
      -- Inspectors can read their own files
      (public.get_user_role() = 'inspector' AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Accounts, Admin, Reports can read all files
      public.get_user_role() IN ('accounts', 'admin', 'reports')
    )
  );

-- Accounts, Admin, Reports can read all bill receipts
CREATE POLICY "Accounts/Admin/Reports can read all bill receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipt' AND
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Only admins can delete bill receipts
CREATE POLICY "Only admins can delete bill receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipt' AND
    public.is_admin()
  );

-- ============================================
-- STORAGE POLICIES FOR BANK-RECEIPT BUCKET (Transaction Receipts)
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Inspectors can upload bank receipts" ON storage.objects;
DROP POLICY IF EXISTS "Inspectors can read own bank receipts" ON storage.objects;
DROP POLICY IF EXISTS "Accounts/Admin/Reports can read all bank receipts" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete bank receipts" ON storage.objects;

-- Inspectors can upload files to their own folder in bank-receipt bucket
CREATE POLICY "Inspectors can upload bank receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-receipt' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inspectors can read files from their own folder
CREATE POLICY "Inspectors can read own bank receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bank-receipt' AND
    (
      -- Inspectors can read their own files
      (public.get_user_role() = 'inspector' AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Accounts, Admin, Reports can read all files
      public.get_user_role() IN ('accounts', 'admin', 'reports')
    )
  );

-- Accounts, Admin, Reports can read all bank receipts
CREATE POLICY "Accounts/Admin/Reports can read all bank receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bank-receipt' AND
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Only admins can delete bank receipts
CREATE POLICY "Only admins can delete bank receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bank-receipt' AND
    public.is_admin()
  );




