-- ============================================
-- Database Inspection Queries
-- Run these in Supabase SQL Editor to inspect current state
-- ============================================

-- ============================================
-- 1. List all tables in public schema
-- ============================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. Check for DCB/Institution related tables
-- ============================================
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%dcb%' OR
    table_name ILIKE '%institution%' OR
    table_name ILIKE '%collection%' OR
    table_name ILIKE '%arrear%' OR
    table_name ILIKE '%balance%'
  )
ORDER BY table_name;

-- ============================================
-- 3. Inspect institution_dcb table structure (if exists)
-- ============================================
SELECT
  column_name,
  data_type,
  character_maximum_length,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'institution_dcb'
ORDER BY ordinal_position;

-- ============================================
-- 4. Check constraints on institution_dcb
-- ============================================
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.institution_dcb'::regclass;

-- ============================================
-- 5. Check RLS status on institution_dcb
-- ============================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'institution_dcb';

-- ============================================
-- 6. Check RLS policies on institution_dcb
-- ============================================
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
  AND tablename = 'institution_dcb';

-- ============================================
-- 7. Count rows in institution_dcb (to see if we need to preserve data)
-- ============================================
SELECT COUNT(*) AS row_count
FROM public.institution_dcb;

-- ============================================
-- 8. Sample data from institution_dcb (first 5 rows)
-- ============================================
SELECT *
FROM public.institution_dcb
LIMIT 5;

-- ============================================
-- 9. Check for other DCB-related tables that might need cleanup
-- ============================================
SELECT
  t.table_name,
  COUNT(c.column_name) AS column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON t.table_name = c.table_name
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND (
    t.table_name ILIKE '%dcb%' OR
    t.table_name ILIKE '%collection%'
  )
GROUP BY t.table_name
ORDER BY t.table_name;
























