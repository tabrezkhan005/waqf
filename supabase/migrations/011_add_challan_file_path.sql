-- Add challan_file_path column to collections table
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS challan_file_path text;

-- Add comment
COMMENT ON COLUMN public.collections.challan_file_path IS 'Path to challan proof file in Supabase Storage';

































