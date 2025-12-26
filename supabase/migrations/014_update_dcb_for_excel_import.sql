-- ============================================
-- Migration: Update institution_dcb for Excel import
-- Ensures all columns match Excel structure exactly
-- ============================================

BEGIN;

-- Ensure all required columns exist
ALTER TABLE public.institution_dcb
  ADD COLUMN IF NOT EXISTS ap_no text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS mandal text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS inspector_name text,
  ADD COLUMN IF NOT EXISTS ext_dry numeric(12,2),
  ADD COLUMN IF NOT EXISTS ext_wet numeric(12,2),
  ADD COLUMN IF NOT EXISTS d_arrears numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS d_current numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS receipt_date date,
  ADD COLUMN IF NOT EXISTS challan_no text,
  ADD COLUMN IF NOT EXISTS challan_date date,
  ADD COLUMN IF NOT EXISTS c_arrears numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS c_current numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS financial_year text NOT NULL DEFAULT '2024-25';

-- Make ap_no NOT NULL if all rows have it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.institution_dcb WHERE ap_no IS NULL) THEN
    ALTER TABLE public.institution_dcb ALTER COLUMN ap_no SET NOT NULL;
  END IF;
END $$;

-- Ensure generated columns exist and are correct
-- Drop and recreate to ensure correct formulas
ALTER TABLE public.institution_dcb
  DROP COLUMN IF EXISTS ext_total,
  DROP COLUMN IF EXISTS d_total,
  DROP COLUMN IF EXISTS c_total,
  DROP COLUMN IF EXISTS b_arrears,
  DROP COLUMN IF EXISTS b_current,
  DROP COLUMN IF EXISTS b_total;

-- Recreate generated columns with proper null handling
ALTER TABLE public.institution_dcb
  ADD COLUMN ext_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(ext_dry, 0) + COALESCE(ext_wet, 0)) STORED,
  ADD COLUMN d_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_arrears, 0) + COALESCE(d_current, 0)) STORED,
  ADD COLUMN c_total numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(c_arrears, 0) + COALESCE(c_current, 0)) STORED,
  ADD COLUMN b_arrears numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_arrears, 0) - COALESCE(c_arrears, 0)) STORED,
  ADD COLUMN b_current numeric(12,2)
    GENERATED ALWAYS AS (COALESCE(d_current, 0) - COALESCE(c_current, 0)) STORED,
  ADD COLUMN b_total numeric(12,2)
    GENERATED ALWAYS AS (
      (COALESCE(d_arrears, 0) - COALESCE(c_arrears, 0)) +
      (COALESCE(d_current, 0) - COALESCE(c_current, 0))
    ) STORED;

-- Ensure unique constraint on (ap_no, financial_year)
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

-- Create/update indexes
CREATE INDEX IF NOT EXISTS idx_institution_dcb_ap_no
  ON public.institution_dcb(ap_no);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_financial_year
  ON public.institution_dcb(financial_year);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_district_name
  ON public.institution_dcb(district_name);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_inspector_name
  ON public.institution_dcb(inspector_name);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_mandal
  ON public.institution_dcb(mandal);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_village
  ON public.institution_dcb(village);

COMMIT;

-- Verification query
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'institution_dcb'
-- ORDER BY ordinal_position;








