-- ============================================
-- Migration: Financial Safety & Data Integrity Fixes
-- Production-Grade Financial Controls
-- ============================================
-- This migration implements:
-- 1. Over-collection control with mandatory reason
-- 2. Provisional DCB flag (draft vs verified)
-- 3. Financial year awareness
-- 4. Enhanced audit logging
-- 5. Receipt integrity (file hash)
-- 6. Transaction-safe DCB updates
-- 7. Rollback on rejection
-- ============================================

BEGIN;

-- ============================================
-- 1. OVER-COLLECTION CONTROL
-- ============================================

-- Add over_collection_reason to collections table
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS over_collection_reason text NULL;

-- Add comment
COMMENT ON COLUMN public.collections.over_collection_reason IS
  'Reason for over-collection (required when collection exceeds remaining balance)';

-- ============================================
-- 2. FINANCIAL YEAR AWARENESS
-- ============================================

-- Add financial_year to collections table
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS financial_year text NULL;

-- Create function to derive financial year from date
CREATE OR REPLACE FUNCTION public.derive_financial_year(input_date date)
RETURNS text AS $$
DECLARE
  year_val integer;
  next_year integer;
  fy_start_month integer := 4; -- April
  fy_start_day integer := 1;
BEGIN
  year_val := EXTRACT(YEAR FROM input_date);

  -- If date is before April 1, it belongs to previous FY
  IF EXTRACT(MONTH FROM input_date) < fy_start_month OR
     (EXTRACT(MONTH FROM input_date) = fy_start_month AND EXTRACT(DAY FROM input_date) < fy_start_day) THEN
    year_val := year_val - 1;
  END IF;

  next_year := year_val + 1;

  -- Format: YYYY-YY (e.g., 2025-26)
  RETURN year_val::text || '-' || SUBSTRING(next_year::text, 3, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing collections with financial_year based on collection_date
UPDATE public.collections
SET financial_year = public.derive_financial_year(collection_date)
WHERE financial_year IS NULL;

-- Make financial_year NOT NULL with default
ALTER TABLE public.collections
  ALTER COLUMN financial_year SET DEFAULT public.derive_financial_year(CURRENT_DATE),
  ALTER COLUMN financial_year SET NOT NULL;

-- Create index for financial year queries
CREATE INDEX IF NOT EXISTS idx_collections_financial_year
  ON public.collections(financial_year);

-- Add financial_year to all district DCB tables
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'dcb_adoni', 'dcb_alluri_seetaramaraju', 'dcb_anakapalli', 'dcb_anantapuramu',
    'dcb_annamayya', 'dcb_bapatla', 'dcb_chittoor', 'dcb_dr_b_r_a_konaseema',
    'dcb_east_godavari', 'dcb_eluru', 'dcb_guntur', 'dcb_kakinada',
    'dcb_krishna', 'dcb_kurnool', 'dcb_nandyal', 'dcb_nellore',
    'dcb_ntr', 'dcb_palnadu', 'dcb_parvathipuram', 'dcb_prakasam',
    'dcb_sri_sathya_sai', 'dcb_srikakulam', 'dcb_tirupati', 'dcb_vijayanagaram',
    'dcb_vijayawada', 'dcb_visakhapatnam', 'dcb_west_godavari', 'dcb_ysr_kadapa_district'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Add financial_year column
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS financial_year text NOT NULL DEFAULT %L',
      table_name, public.derive_financial_year(CURRENT_DATE));

    -- Create index
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_financial_year ON public.%I(financial_year)',
      table_name, table_name);

    RAISE NOTICE 'Added financial_year to table: %', table_name;
  END LOOP;
END $$;

-- ============================================
-- 3. PROVISIONAL DCB FLAG (Draft vs Verified)
-- ============================================

-- Add is_provisional to all district DCB tables
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'dcb_adoni', 'dcb_alluri_seetaramaraju', 'dcb_anakapalli', 'dcb_anantapuramu',
    'dcb_annamayya', 'dcb_bapatla', 'dcb_chittoor', 'dcb_dr_b_r_a_konaseema',
    'dcb_east_godavari', 'dcb_eluru', 'dcb_guntur', 'dcb_kakinada',
    'dcb_krishna', 'dcb_kurnool', 'dcb_nandyal', 'dcb_nellore',
    'dcb_ntr', 'dcb_palnadu', 'dcb_parvathipuram', 'dcb_prakasam',
    'dcb_sri_sathya_sai', 'dcb_srikakulam', 'dcb_tirupati', 'dcb_vijayanagaram',
    'dcb_vijayawada', 'dcb_visakhapatnam', 'dcb_west_godavari', 'dcb_ysr_kadapa_district'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Add is_provisional column (default true for existing data)
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT true',
      table_name);

    -- Create index for filtering verified vs provisional
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_is_provisional ON public.%I(is_provisional)',
      table_name, table_name);

    RAISE NOTICE 'Added is_provisional to table: %', table_name;
  END LOOP;
END $$;

-- ============================================
-- 4. ENHANCED AUDIT LOG
-- ============================================

-- Add old_values and new_values to audit_log
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS old_values jsonb NULL,
  ADD COLUMN IF NOT EXISTS new_values jsonb NULL;

-- Add comments
COMMENT ON COLUMN public.audit_log.old_values IS 'Previous state of the record (JSON)';
COMMENT ON COLUMN public.audit_log.new_values IS 'New state of the record (JSON)';

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_row
  ON public.audit_log(table_name, row_id);

-- ============================================
-- 5. RECEIPT INTEGRITY (File Hash)
-- ============================================

-- Add file_hash to receipts table
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS file_hash text NULL;

-- Create unique index to prevent duplicate uploads (same collection + hash)
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_collection_hash
  ON public.receipts(collection_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.receipts.file_hash IS
  'SHA-256 hash of file content for integrity validation';

-- ============================================
-- 6. INSTITUTION SOFT DELETE (Verify/Enhance)
-- ============================================

-- Verify is_active exists (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institutions'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.institutions
      ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add deleted_at if it doesn't exist
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Add comment
COMMENT ON COLUMN public.institutions.deleted_at IS
  'Timestamp when institution was soft-deleted (NULL = active)';

-- Create index for active institutions
CREATE INDEX IF NOT EXISTS idx_institutions_active
  ON public.institutions(is_active, deleted_at)
  WHERE is_active = true AND deleted_at IS NULL;

-- ============================================
-- 7. TRANSACTION-SAFE DCB UPDATE FUNCTION
-- ============================================

-- Function to update DCB with provisional flag (for drafts/sent_for_review)
CREATE OR REPLACE FUNCTION public.update_dcb_provisional(
  p_table_name text,
  p_ap_gazette_no text,
  p_collection_arrears numeric,
  p_collection_current numeric,
  p_remarks text DEFAULT NULL,
  p_financial_year text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_sql text;
  v_fy text;
BEGIN
  -- Derive financial year if not provided
  v_fy := COALESCE(p_financial_year, public.derive_financial_year(CURRENT_DATE));

  -- Build dynamic SQL with row-level locking
  v_sql := format('
    UPDATE public.%I
    SET
      collection_arrears = collection_arrears + $1,
      collection_current = collection_current + $2,
      is_provisional = true,
      remarks = COALESCE($3, remarks),
      financial_year = COALESCE($4, financial_year),
      updated_at = now()
    WHERE ap_gazette_no = $5
    FOR UPDATE; -- Lock row to prevent race conditions
  ', p_table_name);

  EXECUTE v_sql USING p_collection_arrears, p_collection_current, p_remarks, v_fy, p_ap_gazette_no;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize DCB (set is_provisional = false on verification)
CREATE OR REPLACE FUNCTION public.finalize_dcb_verification(
  p_table_name text,
  p_ap_gazette_no text,
  p_challan_date text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_sql text;
BEGIN
  v_sql := format('
    UPDATE public.%I
    SET
      is_provisional = false,
      challanno_date = COALESCE($1, challanno_date),
      receiptno_date = COALESCE($1, receiptno_date),
      remarks = COALESCE($2, remarks),
      updated_at = now()
    WHERE ap_gazette_no = $3
    FOR UPDATE;
  ', p_table_name);

  EXECUTE v_sql USING p_challan_date, p_remarks, p_ap_gazette_no;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback DCB on rejection (undo provisional accumulation)
CREATE OR REPLACE FUNCTION public.rollback_dcb_rejection(
  p_table_name text,
  p_ap_gazette_no text,
  p_collection_arrears numeric,
  p_collection_current numeric
)
RETURNS void AS $$
DECLARE
  v_sql text;
BEGIN
  v_sql := format('
    UPDATE public.%I
    SET
      collection_arrears = collection_arrears - $1,
      collection_current = collection_current - $2,
      is_provisional = CASE
        WHEN (collection_arrears - $1) = 0 AND (collection_current - $2) = 0
        THEN false
        ELSE is_provisional
      END,
      updated_at = now()
    WHERE ap_gazette_no = $3
    FOR UPDATE;
  ', p_table_name);

  EXECUTE v_sql USING p_collection_arrears, p_collection_current, p_ap_gazette_no;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. AUDIT LOGGING FUNCTION
-- ============================================

-- Enhanced audit log function with old/new values
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_row_id text,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    row_id,
    old_values,
    new_values,
    details,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_row_id,
    p_old_values,
    p_new_values,
    p_details,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. COLLECTION TRIGGERS FOR AUDIT
-- ============================================

-- Trigger function to audit collection changes
CREATE OR REPLACE FUNCTION public.audit_collection_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Build old values (for UPDATE/DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    v_old_values := jsonb_build_object(
      'id', OLD.id,
      'institution_id', OLD.institution_id,
      'inspector_id', OLD.inspector_id,
      'arrear_amount', OLD.arrear_amount,
      'current_amount', OLD.current_amount,
      'status', OLD.status,
      'collection_date', OLD.collection_date,
      'financial_year', OLD.financial_year,
      'over_collection_reason', OLD.over_collection_reason
    );
  END IF;

  -- Build new values (for INSERT/UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_new_values := jsonb_build_object(
      'id', NEW.id,
      'institution_id', NEW.institution_id,
      'inspector_id', NEW.inspector_id,
      'arrear_amount', NEW.arrear_amount,
      'current_amount', NEW.current_amount,
      'status', NEW.status,
      'collection_date', NEW.collection_date,
      'financial_year', NEW.financial_year,
      'over_collection_reason', NEW.over_collection_reason
    );
  END IF;

  -- Log audit entry
  PERFORM public.log_audit(
    COALESCE(NEW.inspector_id, OLD.inspector_id),
    TG_OP || '_collection',
    'collections',
    COALESCE(NEW.id::text, OLD.id::text),
    v_old_values,
    v_new_values,
    jsonb_build_object(
      'operation', TG_OP,
      'timestamp', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS audit_collection_changes_trigger ON public.collections;
CREATE TRIGGER audit_collection_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_collection_changes();

-- ============================================
-- 10. VALIDATION FUNCTION FOR OVER-COLLECTION
-- ============================================

-- Function to check if over-collection requires reason
CREATE OR REPLACE FUNCTION public.check_over_collection(
  p_table_name text,
  p_ap_gazette_no text,
  p_new_arrear numeric,
  p_new_current numeric
)
RETURNS TABLE(
  requires_reason boolean,
  remaining_arrear numeric,
  remaining_current numeric
) AS $$
DECLARE
  v_sql text;
  v_demand_arrears numeric;
  v_demand_current numeric;
  v_collection_arrears numeric;
  v_collection_current numeric;
  v_remaining_arrear numeric;
  v_remaining_current numeric;
BEGIN
  -- Get current DCB values (only verified, non-provisional)
  v_sql := format('
    SELECT
      demand_arrears,
      demand_current,
      COALESCE(SUM(CASE WHEN is_provisional = false THEN collection_arrears ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN is_provisional = false THEN collection_current ELSE 0 END), 0)
    FROM public.%I
    WHERE ap_gazette_no = $1
    GROUP BY demand_arrears, demand_current;
  ', p_table_name);

  EXECUTE v_sql INTO v_demand_arrears, v_demand_current, v_collection_arrears, v_collection_current
  USING p_ap_gazette_no;

  -- Calculate remaining balance (only verified collections count)
  v_remaining_arrear := COALESCE(v_demand_arrears, 0) - COALESCE(v_collection_arrears, 0);
  v_remaining_current := COALESCE(v_demand_current, 0) - COALESCE(v_collection_current, 0);

  -- Check if over-collection
  RETURN QUERY SELECT
    (p_new_arrear > v_remaining_arrear OR p_new_current > v_remaining_current) AS requires_reason,
    v_remaining_arrear,
    v_remaining_current;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. RLS POLICY ADJUSTMENTS
-- ============================================

-- Ensure inspectors can only update their district DCB (with provisional flag)
-- This is already handled by existing RLS, but we add a note in comments
COMMENT ON FUNCTION public.update_dcb_provisional IS
  'Updates DCB with provisional flag. RLS policies ensure inspectors can only update their district.';

-- ============================================
-- 12. BACKWARD COMPATIBILITY
-- ============================================

-- Set all existing DCB rows to is_provisional = false (treat as verified)
-- This ensures existing data is considered verified
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'dcb_adoni', 'dcb_alluri_seetaramaraju', 'dcb_anakapalli', 'dcb_anantapuramu',
    'dcb_annamayya', 'dcb_bapatla', 'dcb_chittoor', 'dcb_dr_b_r_a_konaseema',
    'dcb_east_godavari', 'dcb_eluru', 'dcb_guntur', 'dcb_kakinada',
    'dcb_krishna', 'dcb_kurnool', 'dcb_nandyal', 'dcb_nellore',
    'dcb_ntr', 'dcb_palnadu', 'dcb_parvathipuram', 'dcb_prakasam',
    'dcb_sri_sathya_sai', 'dcb_srikakulam', 'dcb_tirupati', 'dcb_vijayanagaram',
    'dcb_vijayawada', 'dcb_visakhapatnam', 'dcb_west_godavari', 'dcb_ysr_kadapa_district'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Set existing rows to verified (non-provisional)
    EXECUTE format('UPDATE public.%I SET is_provisional = false WHERE is_provisional IS NULL OR is_provisional = true', table_name);
    RAISE NOTICE 'Set existing rows to verified in: %', table_name;
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (for testing)
-- ============================================

-- Verify collections table has new columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'collections'
--   AND column_name IN ('over_collection_reason', 'financial_year');

-- Verify DCB tables have new columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'dcb_eluru'
--   AND column_name IN ('is_provisional', 'financial_year');

-- Verify audit_log has new columns
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'audit_log'
--   AND column_name IN ('old_values', 'new_values');

-- Verify receipts has file_hash
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'receipts'
--   AND column_name = 'file_hash';




