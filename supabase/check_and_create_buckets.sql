-- ============================================
-- Check and Create Storage Buckets
-- ============================================
-- This script checks if required buckets exist and provides instructions
-- to create them if they don't exist.

-- Check existing buckets
SELECT
  name,
  id,
  public,
  created_at,
  updated_at,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- Required buckets:
-- 1. 'receipt' - for bill receipts (private)
-- 2. 'bank-receipt' - for bank/transaction receipts (private)
-- 3. 'inspector-images' - for inspector uploaded images (private)

-- If buckets don't exist, create them via Supabase Dashboard:
-- 1. Go to Storage > New bucket
-- 2. Create each bucket with:
--    - Name: receipt (or bank-receipt, or inspector-images)
--    - Public: false (private bucket)
--    - File size limit: 10MB (recommended)
--    - Allowed MIME types: image/* (recommended)

-- Or use Supabase CLI:
-- supabase storage create receipt --public false
-- supabase storage create bank-receipt --public false
-- supabase storage create inspector-images --public false




