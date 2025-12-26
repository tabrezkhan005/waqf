-- ============================================
-- Inspector Images Storage Bucket Setup
-- ============================================
-- This migration creates storage policies for the 'inspector-images' bucket
-- Note: The bucket itself must be created via Supabase Dashboard or CLI:
--   - Go to Storage > New bucket
--   - Name: inspector-images
--   - Public: false (private bucket)
--   - File size limit: 10MB (recommended)
--   - Allowed MIME types: image/* (recommended)

-- ============================================
-- STORAGE POLICIES FOR INSPECTOR-IMAGES BUCKET
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Inspectors can upload images to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Inspectors can read own images" ON storage.objects;
DROP POLICY IF EXISTS "Inspectors can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Inspectors can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Accounts/Admin/Reports can read all inspector images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any inspector images" ON storage.objects;

-- Inspectors can upload images to their own folder
-- Folder structure: {user_id}/{filename}
CREATE POLICY "Inspectors can upload images to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspector-images' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inspectors can read files from their own folder
CREATE POLICY "Inspectors can read own images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspector-images' AND
    (
      -- Inspectors can read their own files
      (public.get_user_role() = 'inspector' AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Accounts, Admin, Reports can read all files
      public.get_user_role() IN ('accounts', 'admin', 'reports')
    )
  );

-- Inspectors can update their own images
CREATE POLICY "Inspectors can update own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'inspector-images' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'inspector-images' AND
    public.get_user_role() = 'inspector' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inspectors can delete their own images
CREATE POLICY "Inspectors can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspector-images' AND
    (
      -- Inspectors can delete their own files
      (public.get_user_role() = 'inspector' AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Admins can delete any file
      public.is_admin()
    )
  );

-- ============================================
-- TABLE TO TRACK UPLOADED IMAGES (Optional)
-- ============================================
-- This table helps track metadata about uploaded images

CREATE TABLE IF NOT EXISTS inspector_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  collection_id BIGINT REFERENCES collections(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspector_images_inspector_id ON inspector_images(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspector_images_institution_id ON inspector_images(institution_id);
CREATE INDEX IF NOT EXISTS idx_inspector_images_collection_id ON inspector_images(collection_id);
CREATE INDEX IF NOT EXISTS idx_inspector_images_uploaded_at ON inspector_images(uploaded_at);

-- Enable RLS on the table
ALTER TABLE inspector_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspector_images table

-- Inspectors can view their own images
CREATE POLICY "Inspectors can view own images"
  ON inspector_images
  FOR SELECT
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    public.get_user_role() IN ('accounts', 'admin', 'reports')
  );

-- Inspectors can insert their own images
CREATE POLICY "Inspectors can insert own images"
  ON inspector_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'inspector' AND
    inspector_id = auth.uid()
  );

-- Inspectors can update their own images
CREATE POLICY "Inspectors can update own images"
  ON inspector_images
  FOR UPDATE
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    public.is_admin()
  )
  WITH CHECK (
    inspector_id = auth.uid() OR
    public.is_admin()
  );

-- Inspectors can delete their own images, admins can delete any
CREATE POLICY "Inspectors can delete own images"
  ON inspector_images
  FOR DELETE
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    public.is_admin()
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inspector_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_inspector_images_updated_at ON inspector_images;
CREATE TRIGGER trigger_update_inspector_images_updated_at
  BEFORE UPDATE ON inspector_images
  FOR EACH ROW
  EXECUTE FUNCTION update_inspector_images_updated_at();

-- Add comment to table
COMMENT ON TABLE inspector_images IS 'Tracks metadata for images uploaded by inspectors to the inspector-images storage bucket';
