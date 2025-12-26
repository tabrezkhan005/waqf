-- ============================================
-- Clean Production DCB Schema
-- Government DCB (Demand-Collection-Balance) Application
-- PostgreSQL 17 + Supabase
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CORE MASTER TABLES
-- ============================================

-- DISTRICTS TABLE
CREATE TABLE IF NOT EXISTS public.districts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'inspector', 'accounts', 'reports')),
  district_id uuid REFERENCES public.districts(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Only inspectors must have district_id
  CONSTRAINT inspector_must_have_district CHECK (
    (role = 'inspector' AND district_id IS NOT NULL) OR
    (role != 'inspector')
  )
  -- Exactly one inspector per district (enforced via unique partial index below)
);

-- Create unique partial index to ensure exactly one inspector per district
CREATE UNIQUE INDEX IF NOT EXISTS unique_inspector_per_district_idx
ON public.profiles (district_id)
WHERE role = 'inspector';

COMMENT ON INDEX unique_inspector_per_district_idx IS
  'Ensures exactly one inspector per district';

-- ============================================
-- 2. INSTITUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  ap_gazette_no text NOT NULL UNIQUE,
  name          text NOT NULL,
  mandal        text,
  village       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_institutions_district_id ON public.institutions(district_id);
CREATE INDEX IF NOT EXISTS idx_institutions_ap_gazette_no ON public.institutions(ap_gazette_no);

-- ============================================
-- 3. DCB MAIN DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.institution_dcb (
  -- Primary identifiers
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  inspector_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- EXTENT (land area)
  extent_dry    numeric NOT NULL DEFAULT 0,
  extent_wet    numeric NOT NULL DEFAULT 0,
  extent_total  numeric GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- DEMAND
  demand_arrears numeric NOT NULL DEFAULT 0,
  demand_current numeric NOT NULL DEFAULT 0,
  demand_total   numeric GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- COLLECTION (may exceed demand - advance payments allowed)
  collection_arrears numeric NOT NULL DEFAULT 0,
  collection_current numeric NOT NULL DEFAULT 0,
  collection_total   numeric GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- BALANCE (can be negative - advance payments)
  balance_arrears numeric GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total   numeric GENERATED ALWAYS AS ((demand_arrears + demand_current) - (collection_arrears + collection_current)) STORED,

  -- META
  remarks        text,
  financial_year text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_institution_dcb_institution_id ON public.institution_dcb(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_inspector_id ON public.institution_dcb(inspector_id);
CREATE INDEX IF NOT EXISTS idx_institution_dcb_financial_year ON public.institution_dcb(financial_year);

-- Add comment explaining advance payments
COMMENT ON TABLE public.institution_dcb IS
  'DCB data with generated totals. Collections may exceed demands (advance payments). Balances can be negative.';

-- ============================================
-- 4. STAGING TABLE FOR EXCEL/CSV IMPORT
-- ============================================

CREATE TABLE IF NOT EXISTS public.institution_dcb_staging (
  -- All columns as TEXT for flexible import
  id                text,
  institution_id    text,
  inspector_id      text,
  extent_dry        text,
  extent_wet        text,
  extent_total      text,
  demand_arrears    text,
  demand_current    text,
  demand_total      text,
  collection_arrears text,
  collection_current text,
  collection_total  text,
  balance_arrears   text,
  balance_current   text,
  balance_total     text,
  remarks           text,
  financial_year    text,
  -- Additional fields for import mapping
  district_name     text,
  ap_gazette_no     text,
  institution_name  text,
  inspector_name    text,
  mandal            text,
  village            text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 5. IMPORT FUNCTIONS
-- ============================================

-- Function to clean numeric text (handles '-', '', null)
CREATE OR REPLACE FUNCTION public.clean_numeric_text(input_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Handle null, empty string, or '-'
  IF input_text IS NULL OR TRIM(input_text) = '' OR TRIM(input_text) = '-' THEN
    RETURN 0;
  END IF;

  -- Try to cast to numeric
  BEGIN
    RETURN CAST(TRIM(input_text) AS numeric);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN 0;
  END;
END;
$$;

-- Main import function
CREATE OR REPLACE FUNCTION public.import_from_staging()
RETURNS TABLE(
  inserted_rows bigint,
  created_districts bigint,
  created_institutions bigint,
  errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_rows bigint := 0;
  v_created_districts bigint := 0;
  v_created_institutions bigint := 0;
  v_errors text[] := ARRAY[]::text[];
  v_staging_record RECORD;
  v_district_id uuid;
  v_institution_id uuid;
  v_inspector_id uuid;
BEGIN
  -- Loop through staging records
  FOR v_staging_record IN
    SELECT * FROM public.institution_dcb_staging
    ORDER BY created_at
  LOOP
    BEGIN
      -- 1. Find or create district
      IF v_staging_record.district_name IS NOT NULL AND TRIM(v_staging_record.district_name) != '' THEN
        SELECT id INTO v_district_id
        FROM public.districts
        WHERE name = TRIM(v_staging_record.district_name);

        IF v_district_id IS NULL THEN
          INSERT INTO public.districts (name)
          VALUES (TRIM(v_staging_record.district_name))
          RETURNING id INTO v_district_id;
          v_created_districts := v_created_districts + 1;
        END IF;
      ELSE
        v_errors := array_append(v_errors, 'Missing district_name in staging record');
        CONTINUE;
      END IF;

      -- 2. Find or create institution
      IF v_staging_record.ap_gazette_no IS NOT NULL AND TRIM(v_staging_record.ap_gazette_no) != '' THEN
        SELECT id INTO v_institution_id
        FROM public.institutions
        WHERE ap_gazette_no = TRIM(v_staging_record.ap_gazette_no);

        IF v_institution_id IS NULL THEN
          INSERT INTO public.institutions (
            district_id,
            ap_gazette_no,
            name,
            mandal,
            village
          )
          VALUES (
            v_district_id,
            TRIM(v_staging_record.ap_gazette_no),
            COALESCE(TRIM(v_staging_record.institution_name), 'Unknown Institution'),
            NULLIF(TRIM(v_staging_record.mandal), ''),
            NULLIF(TRIM(v_staging_record.village), '')
          )
          RETURNING id INTO v_institution_id;
          v_created_institutions := v_created_institutions + 1;
        END IF;
      ELSE
        v_errors := array_append(v_errors, 'Missing ap_gazette_no in staging record');
        CONTINUE;
      END IF;

      -- 3. Find inspector for this district
      SELECT id INTO v_inspector_id
      FROM public.profiles
      WHERE role = 'inspector' AND district_id = v_district_id;

      IF v_inspector_id IS NULL THEN
        v_errors := array_append(v_errors,
          format('No inspector found for district: %s', v_staging_record.district_name));
        CONTINUE;
      END IF;

      -- 4. Insert into institution_dcb
      INSERT INTO public.institution_dcb (
        institution_id,
        inspector_id,
        extent_dry,
        extent_wet,
        demand_arrears,
        demand_current,
        collection_arrears,
        collection_current,
        remarks,
        financial_year
      )
      VALUES (
        v_institution_id,
        v_inspector_id,
        public.clean_numeric_text(v_staging_record.extent_dry),
        public.clean_numeric_text(v_staging_record.extent_wet),
        public.clean_numeric_text(v_staging_record.demand_arrears),
        public.clean_numeric_text(v_staging_record.demand_current),
        public.clean_numeric_text(v_staging_record.collection_arrears),
        public.clean_numeric_text(v_staging_record.collection_current),
        NULLIF(TRIM(v_staging_record.remarks), ''),
        COALESCE(TRIM(v_staging_record.financial_year), '2024-25')
      );

      v_inserted_rows := v_inserted_rows + 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_errors := array_append(v_errors,
          format('Error processing record: %s', SQLERRM));
    END;
  END LOOP;

  -- Truncate staging table after successful processing
  IF array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0 THEN
    TRUNCATE TABLE public.institution_dcb_staging;
  END IF;

  RETURN QUERY SELECT v_inserted_rows, v_created_districts, v_created_institutions, v_errors;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.import_from_staging() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_numeric_text(text) TO authenticated;

-- ============================================
-- 6. ROW LEVEL SECURITY (MANDATORY)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_dcb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_dcb_staging ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to get inspector district
CREATE OR REPLACE FUNCTION public.get_inspector_district()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT district_id FROM public.profiles
  WHERE id = auth.uid() AND role = 'inspector';
$$;

-- ============================================
-- RLS POLICIES: DISTRICTS
-- ============================================

-- Admin: Full access
CREATE POLICY "admin_full_access_districts"
ON public.districts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Inspector: Read own district
CREATE POLICY "inspector_read_own_district"
ON public.districts
FOR SELECT
TO authenticated
USING (
  id = public.get_inspector_district()
  OR public.is_admin()
);

-- Accounts: Read all
CREATE POLICY "accounts_read_all_districts"
ON public.districts
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'accounts'
  OR public.is_admin()
);

-- Reports: Read all
CREATE POLICY "reports_read_all_districts"
ON public.districts
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'reports'
  OR public.is_admin()
);

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================

-- Admin: Full access
CREATE POLICY "admin_full_access_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users: Read own profile
CREATE POLICY "users_read_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
);

-- Inspector: Read profiles in own district
CREATE POLICY "inspector_read_district_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  district_id = public.get_inspector_district()
  OR public.is_admin()
);

-- Accounts & Reports: Read all profiles
CREATE POLICY "accounts_reports_read_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_role() IN ('accounts', 'reports')
  OR public.is_admin()
);

-- ============================================
-- RLS POLICIES: INSTITUTIONS
-- ============================================

-- Admin: Full access
CREATE POLICY "admin_full_access_institutions"
ON public.institutions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Inspector: Read/write institutions in own district
CREATE POLICY "inspector_manage_district_institutions"
ON public.institutions
FOR ALL
TO authenticated
USING (
  district_id = public.get_inspector_district()
  OR public.is_admin()
)
WITH CHECK (
  district_id = public.get_inspector_district()
  OR public.is_admin()
);

-- Accounts: Read all institutions
CREATE POLICY "accounts_read_all_institutions"
ON public.institutions
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'accounts'
  OR public.is_admin()
);

-- Reports: Read all institutions
CREATE POLICY "reports_read_all_institutions"
ON public.institutions
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'reports'
  OR public.is_admin()
);

-- ============================================
-- RLS POLICIES: INSTITUTION_DCB
-- ============================================

-- Admin: Full access
CREATE POLICY "admin_full_access_institution_dcb"
ON public.institution_dcb
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Inspector: Read/write DCB for own district only
CREATE POLICY "inspector_manage_district_dcb"
ON public.institution_dcb
FOR ALL
TO authenticated
USING (
  public.is_admin()
  OR (
    public.get_user_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE i.id = institution_dcb.institution_id
      AND i.district_id = public.get_inspector_district()
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    public.get_user_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE i.id = institution_dcb.institution_id
      AND i.district_id = public.get_inspector_district()
    )
  )
);

-- Accounts: Read-only access to all DCB
CREATE POLICY "accounts_read_all_dcb"
ON public.institution_dcb
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'accounts'
  OR public.is_admin()
);

-- Reports: Read-only access to all DCB
CREATE POLICY "reports_read_all_dcb"
ON public.institution_dcb
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'reports'
  OR public.is_admin()
);

-- ============================================
-- RLS POLICIES: STAGING TABLE
-- ============================================

-- Only admin can access staging table
CREATE POLICY "admin_only_staging"
ON public.institution_dcb_staging
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- 7. INSERT 26 DISTRICTS
-- ============================================

-- Insert 26 districts (Andhra Pradesh districts)
INSERT INTO public.districts (name) VALUES
  ('Anantapur'),
  ('Chittoor'),
  ('East Godavari'),
  ('Guntur'),
  ('Kadapa'),
  ('Krishna'),
  ('Kurnool'),
  ('Nellore'),
  ('Prakasam'),
  ('Srikakulam'),
  ('Visakhapatnam'),
  ('Vizianagaram'),
  ('West Godavari'),
  ('Adoni'),
  ('Nandyal'),
  ('Eluru'),
  ('Machilipatnam'),
  ('Ongole'),
  ('Tirupati'),
  ('Vijayawada'),
  ('Rajahmundry'),
  ('Kakinada'),
  ('Narasaraopet'),
  ('Tenali'),
  ('Chilakaluripet'),
  ('Bhimavaram')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. GRANTS AND PERMISSIONS
-- ============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
