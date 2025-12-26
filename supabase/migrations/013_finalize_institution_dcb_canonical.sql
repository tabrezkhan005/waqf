-- ============================================
-- Migration: Finalize institution_dcb to canonical Excel schema
-- This ensures all columns match the Excel DCB sheet exactly
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Ensure all required columns exist with correct types
-- ============================================

-- Identity columns (from Excel)
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ap_no text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS inspector_name text;

-- Land area columns
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ext_dry numeric(12,2),
  ADD COLUMN IF NOT EXISTS ext_wet numeric(12,2);

-- Demand columns (ensure plural naming)
DO $$
BEGIN
  -- Rename d_arrear to d_arrears if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institution_dcb'
      AND column_name = 'd_arrear'
  ) THEN
    ALTER TABLE public.institution_dcb RENAME COLUMN d_arrear TO d_arrears;
  END IF;

  -- Rename c_arrear to c_arrears if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institution_dcb'
      AND column_name = 'c_arrear'
  ) THEN
    ALTER TABLE public.institution_dcb RENAME COLUMN c_arrear TO c_arrears;
  END IF;
END $$;

-- Ensure demand columns exist
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS d_arrears numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS d_current numeric(12,2) DEFAULT 0;

-- Ensure collection columns exist
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS c_arrears numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS c_current numeric(12,2) DEFAULT 0;

-- Receipt metadata
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS receipt_date date;

-- File paths and remarks
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS receipt_file_path text,
  ADD COLUMN IF NOT EXISTS bank_receipt_file_path text,
  ADD COLUMN IF NOT EXISTS remarks text;

-- Ensure financial_year exists (should already exist)
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS financial_year text NOT NULL DEFAULT '2024-25';

-- Ensure timestamps exist
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================
-- STEP 2: Drop old generated columns that might have wrong expressions
-- ============================================

ALTER TABLE public.institution_dcb
  DROP COLUMN IF EXISTS d_total,
  DROP COLUMN IF EXISTS c_total,
  DROP COLUMN IF EXISTS b_arrear,
  DROP COLUMN IF EXISTS b_arrears,
  DROP COLUMN IF EXISTS b_current,
  DROP COLUMN IF EXISTS b_total,
  DROP COLUMN IF EXISTS ext_total;

-- ============================================
-- STEP 3: Recreate all generated columns with correct expressions
-- ============================================

-- Land area total
ALTER TABLE public.institution_dcb
  ADD COLUMN ext_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(ext_dry, 0) + COALESCE(ext_wet, 0)) STORED;

-- Demand total
ALTER TABLE public.institution_dcb
  ADD COLUMN d_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_arrears, 0) + COALESCE(d_current, 0)) STORED;

-- Collection total
ALTER TABLE public.institution_dcb
  ADD COLUMN c_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(c_arrears, 0) + COALESCE(c_current, 0)) STORED;

-- Balance columns (computed from Demand - Collection)
ALTER TABLE public.institution_dcb
  ADD COLUMN b_arrears numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_arrears, 0) - COALESCE(c_arrears, 0)) STORED,
  ADD COLUMN b_current numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_current, 0) - COALESCE(c_current, 0)) STORED,
  ADD COLUMN b_total numeric(12,2)
    GENERATED ALWAYS AS (
      (COALESCE(d_arrears, 0) - COALESCE(c_arrears, 0)) +
      (COALESCE(d_current, 0) - COALESCE(c_current, 0))
    ) STORED;

-- ============================================
-- STEP 4: Update constraints
-- ============================================

-- Make ap_no NOT NULL (only if table is empty or all rows have ap_no)
-- If you have existing data, you'll need to populate ap_no first
DO $$
BEGIN
  -- Check if there are any NULL ap_no values
  IF NOT EXISTS (
    SELECT 1 FROM public.institution_dcb WHERE ap_no IS NULL
  ) THEN
    ALTER TABLE public.institution_dcb ALTER COLUMN ap_no SET NOT NULL;
  ELSE
    RAISE NOTICE 'WARNING: Cannot set ap_no NOT NULL - there are NULL values. Please populate ap_no first.';
  END IF;
END $$;

-- Add unique constraint on (ap_no, financial_year) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'institution_dcb_apno_year_unique'
      AND conrelid = 'public.institution_dcb'::regclass
  ) THEN
    ALTER TABLE public.institution_dcb
      ADD CONSTRAINT institution_dcb_apno_year_unique
      UNIQUE (ap_no, financial_year);
  END IF;
END $$;

-- ============================================
-- STEP 5: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.institution_dcb ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create/update indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_institution_dcb_ap_no
  ON public.institution_dcb(ap_no);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_financial_year
  ON public.institution_dcb(financial_year);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_district_name
  ON public.institution_dcb(district_name);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_inspector_name
  ON public.institution_dcb(inspector_name);

COMMIT;

-- ============================================
-- Verification Query (run this after migration to check schema)
-- ============================================
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'institution_dcb'
-- ORDER BY ordinal_position;
















