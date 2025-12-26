-- ============================================
-- Migration: Update public.institution_dcb schema to canonical Excel mapping
-- ============================================

BEGIN;

-- 1) Add identity/label columns for Excel alignment
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ap_no text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS inspector_name text;

-- 2) Land area columns
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ext_dry numeric(12,2),
  ADD COLUMN IF NOT EXISTS ext_wet numeric(12,2);

-- 3) Demand and Collection columns: rename to match plural form
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institution_dcb'
      AND column_name = 'd_arrear'
  ) THEN
    EXECUTE 'ALTER TABLE public.institution_dcb RENAME COLUMN d_arrear TO d_arrears';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institution_dcb'
      AND column_name = 'c_arrear'
  ) THEN
    EXECUTE 'ALTER TABLE public.institution_dcb RENAME COLUMN c_arrear TO c_arrears';
  END IF;
END
$$;

-- 4) Drop old generated columns that depend on old names, then re-add with new expressions
ALTER TABLE public.institution_dcb
  DROP COLUMN IF EXISTS d_total,
  DROP COLUMN IF EXISTS b_arrear,
  DROP COLUMN IF EXISTS b_current;

-- 5) Receipt metadata
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS receipt_date date;

-- 6) Files and remarks
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS receipt_file_path text,
  ADD COLUMN IF NOT EXISTS bank_receipt_file_path text,
  ADD COLUMN IF NOT EXISTS remarks text;

-- 7) Recreate all generated totals (use COALESCE for robustness)
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ext_total numeric(12,2) GENERATED ALWAYS AS (COALESCE(ext_dry,0) + COALESCE(ext_wet,0)) STORED,
  ADD COLUMN IF NOT EXISTS d_total   numeric(12,2) GENERATED ALWAYS AS (COALESCE(d_arrears,0) + COALESCE(d_current,0)) STORED,
  ADD COLUMN IF NOT EXISTS c_total   numeric(12,2) GENERATED ALWAYS AS (COALESCE(c_arrears,0) + COALESCE(c_current,0)) STORED,
  ADD COLUMN IF NOT EXISTS b_arrears numeric(12,2) GENERATED ALWAYS AS (COALESCE(d_arrears,0) - COALESCE(c_arrears,0)) STORED,
  ADD COLUMN IF NOT EXISTS b_current numeric(12,2) GENERATED ALWAYS AS (COALESCE(d_current,0) - COALESCE(c_current,0)) STORED,
  ADD COLUMN IF NOT EXISTS b_total   numeric(12,2) GENERATED ALWAYS AS (COALESCE(b_arrears,0) + COALESCE(b_current,0)) STORED;

-- 8) Constraints: ap_no + financial_year should be unique per row
ALTER TABLE public.institution_dcb
  ALTER COLUMN ap_no SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'institution_dcb_apno_year_unique'
      AND conrelid = 'public.institution_dcb'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.institution_dcb ADD CONSTRAINT institution_dcb_apno_year_unique UNIQUE (ap_no, financial_year)';
  END IF;
END
$$;

COMMIT;

-- RLS already enabled in earlier migration; no changes needed here.
