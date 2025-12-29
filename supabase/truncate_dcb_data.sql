-- ============================================
-- ⚠️ DESTRUCTIVE OPERATION: Truncate DCB Data
-- ============================================
--
-- WARNING: This will DELETE ALL DATA from the specified tables.
-- Only run this if you want to start fresh with Excel import.
--
-- Review the tables below before executing.
-- ============================================

BEGIN;

-- ============================================
-- Tables that will be truncated:
-- ============================================
-- 1. public.institution_dcb - Main DCB table (all rows)
--
-- Note: This does NOT truncate:
-- - public.institutions (master institution list)
-- - public.collections (separate collection records)
-- - public.receipts (receipt files)
-- - public.profiles, public.districts (reference data)
-- ============================================

-- Check current row count before truncation
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.institution_dcb;
  RAISE NOTICE 'Current rows in institution_dcb: %', row_count;
END $$;

-- ============================================
-- TRUNCATE STATEMENTS
-- ============================================
-- Uncomment the line below to actually truncate:
-- TRUNCATE TABLE public.institution_dcb RESTART IDENTITY CASCADE;

-- RESTART IDENTITY resets the auto-increment sequence
-- CASCADE will also truncate any dependent tables (if any foreign keys reference this)

-- ============================================
-- Alternative: If you want to keep some data, use DELETE instead:
-- ============================================
-- DELETE FROM public.institution_dcb WHERE financial_year = '2024-25';
-- (This deletes only specific financial year)

COMMIT;

-- ============================================
-- Verification after truncation:
-- ============================================
-- SELECT COUNT(*) FROM public.institution_dcb; -- Should return 0
























