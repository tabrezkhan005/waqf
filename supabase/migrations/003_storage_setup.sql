-- ============================================
-- Storage Bucket Setup
-- ============================================

-- Create receipts bucket (if not exists)
-- Note: This should be run via Supabase Dashboard or CLI
-- The bucket should be created as private

-- Storage policies are defined below
-- Bucket name: 'receipts'

-- ============================================
-- STORAGE POLICIES FOR RECEIPTS BUCKET
-- ============================================

-- Inspectors can upload files to their own folder
CREATE POLICY "Inspectors can upload to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inspectors can read files from their own folder
CREATE POLICY "Inspectors can read own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Accounts, Admin, Reports can read all files
CREATE POLICY "Accounts/Admin/Reports can read all receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Only admins can delete files
CREATE POLICY "Only admins can delete receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    public.is_admin()
  );

-- Only admins can update file metadata
CREATE POLICY "Only admins can update receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'receipts' AND
    public.is_admin()
  );




