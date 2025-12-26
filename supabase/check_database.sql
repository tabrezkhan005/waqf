-- ============================================
-- Database Inspection Script for 'waqf'
-- Run this in Supabase Dashboard SQL Editor
-- ============================================

-- 1. Check if all tables exist
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. List all tables with row counts
SELECT
  schemaname || '.' || tablename AS table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = schemaname AND table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Check specific tables structure
-- Districts
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'districts'
ORDER BY ordinal_position;

-- Profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Institutions
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'institutions'
ORDER BY ordinal_position;

-- Collections
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'collections'
ORDER BY ordinal_position;

-- Receipts
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'receipts'
ORDER BY ordinal_position;

-- Audit Log
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_log'
ORDER BY ordinal_position;

-- 5. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. Check triggers
SELECT
  trigger_schema,
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 8. Count records in each table (if tables exist)
SELECT
  'districts' AS table_name,
  COUNT(*) AS record_count
FROM public.districts
UNION ALL
SELECT
  'profiles' AS table_name,
  COUNT(*) AS record_count
FROM public.profiles
UNION ALL
SELECT
  'institutions' AS table_name,
  COUNT(*) AS record_count
FROM public.institutions
UNION ALL
SELECT
  'collections' AS table_name,
  COUNT(*) AS record_count
FROM public.collections
UNION ALL
SELECT
  'receipts' AS table_name,
  COUNT(*) AS record_count
FROM public.receipts
UNION ALL
SELECT
  'audit_log' AS table_name,
  COUNT(*) AS record_count
FROM public.audit_log;

-- 9. Check storage buckets
SELECT
  name,
  id,
  public,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- 10. Check storage policies
SELECT
  name,
  bucket_id,
  definition
FROM storage.policies
ORDER BY bucket_id, name;




