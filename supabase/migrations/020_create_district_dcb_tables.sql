-- ============================================
-- Create District-Specific DCB Tables
-- Each district gets its own DCB table with auto-calculated balance columns
-- ============================================

-- Delete existing DCB data
TRUNCATE TABLE public.institution_dcb CASCADE;

-- ============================================
-- Create tables for each district
-- ============================================

-- Eluru

-- Create DCB table for Eluru
CREATE TABLE IF NOT EXISTS public.dcb_eluru (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_eluru_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_eluru_ap_gazette_no ON public.dcb_eluru(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_eluru_institution_name ON public.dcb_eluru(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_eluru_mandal ON public.dcb_eluru(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_eluru_village ON public.dcb_eluru(village);

-- Enable RLS
ALTER TABLE public.dcb_eluru ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_eluru_select_policy"
  ON public.dcb_eluru
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_eluru_insert_policy"
  ON public.dcb_eluru
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_eluru_update_policy"
  ON public.dcb_eluru
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_eluru_delete_policy"
  ON public.dcb_eluru
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_eluru IS 'DCB data for Eluru district';


-- Vijayanagaram

-- Create DCB table for Vijayanagaram
CREATE TABLE IF NOT EXISTS public.dcb_vijayanagaram (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_vijayanagaram_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_vijayanagaram_ap_gazette_no ON public.dcb_vijayanagaram(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayanagaram_institution_name ON public.dcb_vijayanagaram(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayanagaram_mandal ON public.dcb_vijayanagaram(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayanagaram_village ON public.dcb_vijayanagaram(village);

-- Enable RLS
ALTER TABLE public.dcb_vijayanagaram ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_vijayanagaram_select_policy"
  ON public.dcb_vijayanagaram
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_vijayanagaram_insert_policy"
  ON public.dcb_vijayanagaram
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_vijayanagaram_update_policy"
  ON public.dcb_vijayanagaram
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_vijayanagaram_delete_policy"
  ON public.dcb_vijayanagaram
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_vijayanagaram IS 'DCB data for Vijayanagaram district';


-- Vijayawada

-- Create DCB table for Vijayawada
CREATE TABLE IF NOT EXISTS public.dcb_vijayawada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_vijayawada_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_vijayawada_ap_gazette_no ON public.dcb_vijayawada(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayawada_institution_name ON public.dcb_vijayawada(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayawada_mandal ON public.dcb_vijayawada(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_vijayawada_village ON public.dcb_vijayawada(village);

-- Enable RLS
ALTER TABLE public.dcb_vijayawada ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_vijayawada_select_policy"
  ON public.dcb_vijayawada
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_vijayawada_insert_policy"
  ON public.dcb_vijayawada
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_vijayawada_update_policy"
  ON public.dcb_vijayawada
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_vijayawada_delete_policy"
  ON public.dcb_vijayawada
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_vijayawada IS 'DCB data for Vijayawada district';


-- Adoni

-- Create DCB table for Adoni
CREATE TABLE IF NOT EXISTS public.dcb_adoni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_adoni_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_adoni_ap_gazette_no ON public.dcb_adoni(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_adoni_institution_name ON public.dcb_adoni(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_adoni_mandal ON public.dcb_adoni(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_adoni_village ON public.dcb_adoni(village);

-- Enable RLS
ALTER TABLE public.dcb_adoni ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_adoni_select_policy"
  ON public.dcb_adoni
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_adoni_insert_policy"
  ON public.dcb_adoni
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_adoni_update_policy"
  ON public.dcb_adoni
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_adoni_delete_policy"
  ON public.dcb_adoni
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_adoni IS 'DCB data for Adoni district';


-- Annamayya

-- Create DCB table for Annamayya
CREATE TABLE IF NOT EXISTS public.dcb_annamayya (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_annamayya_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_annamayya_ap_gazette_no ON public.dcb_annamayya(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_annamayya_institution_name ON public.dcb_annamayya(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_annamayya_mandal ON public.dcb_annamayya(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_annamayya_village ON public.dcb_annamayya(village);

-- Enable RLS
ALTER TABLE public.dcb_annamayya ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_annamayya_select_policy"
  ON public.dcb_annamayya
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_annamayya_insert_policy"
  ON public.dcb_annamayya
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_annamayya_update_policy"
  ON public.dcb_annamayya
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_annamayya_delete_policy"
  ON public.dcb_annamayya
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_annamayya IS 'DCB data for Annamayya district';


-- Anantapuramu

-- Create DCB table for Anantapuramu
CREATE TABLE IF NOT EXISTS public.dcb_anantapuramu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_anantapuramu_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_anantapuramu_ap_gazette_no ON public.dcb_anantapuramu(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_anantapuramu_institution_name ON public.dcb_anantapuramu(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_anantapuramu_mandal ON public.dcb_anantapuramu(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_anantapuramu_village ON public.dcb_anantapuramu(village);

-- Enable RLS
ALTER TABLE public.dcb_anantapuramu ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_anantapuramu_select_policy"
  ON public.dcb_anantapuramu
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_anantapuramu_insert_policy"
  ON public.dcb_anantapuramu
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_anantapuramu_update_policy"
  ON public.dcb_anantapuramu
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_anantapuramu_delete_policy"
  ON public.dcb_anantapuramu
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_anantapuramu IS 'DCB data for Anantapuramu district';


-- Bapatla

-- Create DCB table for Bapatla
CREATE TABLE IF NOT EXISTS public.dcb_bapatla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_bapatla_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_bapatla_ap_gazette_no ON public.dcb_bapatla(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_bapatla_institution_name ON public.dcb_bapatla(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_bapatla_mandal ON public.dcb_bapatla(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_bapatla_village ON public.dcb_bapatla(village);

-- Enable RLS
ALTER TABLE public.dcb_bapatla ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_bapatla_select_policy"
  ON public.dcb_bapatla
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_bapatla_insert_policy"
  ON public.dcb_bapatla
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_bapatla_update_policy"
  ON public.dcb_bapatla
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_bapatla_delete_policy"
  ON public.dcb_bapatla
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_bapatla IS 'DCB data for Bapatla district';


-- Alluri Seetaramaraju

-- Create DCB table for Alluri Seetaramaraju
CREATE TABLE IF NOT EXISTS public.dcb_alluri_seetaramaraju (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_alluri_seetaramaraju_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_alluri_seetaramaraju_ap_gazette_no ON public.dcb_alluri_seetaramaraju(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_alluri_seetaramaraju_institution_name ON public.dcb_alluri_seetaramaraju(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_alluri_seetaramaraju_mandal ON public.dcb_alluri_seetaramaraju(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_alluri_seetaramaraju_village ON public.dcb_alluri_seetaramaraju(village);

-- Enable RLS
ALTER TABLE public.dcb_alluri_seetaramaraju ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_alluri_seetaramaraju_select_policy"
  ON public.dcb_alluri_seetaramaraju
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_alluri_seetaramaraju_insert_policy"
  ON public.dcb_alluri_seetaramaraju
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_alluri_seetaramaraju_update_policy"
  ON public.dcb_alluri_seetaramaraju
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_alluri_seetaramaraju_delete_policy"
  ON public.dcb_alluri_seetaramaraju
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_alluri_seetaramaraju IS 'DCB data for Alluri Seetaramaraju district';


-- Anakapalli

-- Create DCB table for Anakapalli
CREATE TABLE IF NOT EXISTS public.dcb_anakapalli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_anakapalli_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_anakapalli_ap_gazette_no ON public.dcb_anakapalli(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_anakapalli_institution_name ON public.dcb_anakapalli(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_anakapalli_mandal ON public.dcb_anakapalli(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_anakapalli_village ON public.dcb_anakapalli(village);

-- Enable RLS
ALTER TABLE public.dcb_anakapalli ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_anakapalli_select_policy"
  ON public.dcb_anakapalli
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_anakapalli_insert_policy"
  ON public.dcb_anakapalli
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_anakapalli_update_policy"
  ON public.dcb_anakapalli
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_anakapalli_delete_policy"
  ON public.dcb_anakapalli
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_anakapalli IS 'DCB data for Anakapalli district';


-- Chittoor

-- Create DCB table for Chittoor
CREATE TABLE IF NOT EXISTS public.dcb_chittoor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_chittoor_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_chittoor_ap_gazette_no ON public.dcb_chittoor(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_chittoor_institution_name ON public.dcb_chittoor(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_chittoor_mandal ON public.dcb_chittoor(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_chittoor_village ON public.dcb_chittoor(village);

-- Enable RLS
ALTER TABLE public.dcb_chittoor ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_chittoor_select_policy"
  ON public.dcb_chittoor
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_chittoor_insert_policy"
  ON public.dcb_chittoor
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_chittoor_update_policy"
  ON public.dcb_chittoor
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_chittoor_delete_policy"
  ON public.dcb_chittoor
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_chittoor IS 'DCB data for Chittoor district';


-- Dr. B.R. A.Konaseema

-- Create DCB table for Dr. B.R. A.Konaseema
CREATE TABLE IF NOT EXISTS public.dcb_dr_b_r_a_konaseema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_dr_b_r_a_konaseema_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_dr_b_r_a_konaseema_ap_gazette_no ON public.dcb_dr_b_r_a_konaseema(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_dr_b_r_a_konaseema_institution_name ON public.dcb_dr_b_r_a_konaseema(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_dr_b_r_a_konaseema_mandal ON public.dcb_dr_b_r_a_konaseema(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_dr_b_r_a_konaseema_village ON public.dcb_dr_b_r_a_konaseema(village);

-- Enable RLS
ALTER TABLE public.dcb_dr_b_r_a_konaseema ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_dr_b_r_a_konaseema_select_policy"
  ON public.dcb_dr_b_r_a_konaseema
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_dr_b_r_a_konaseema_insert_policy"
  ON public.dcb_dr_b_r_a_konaseema
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_dr_b_r_a_konaseema_update_policy"
  ON public.dcb_dr_b_r_a_konaseema
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_dr_b_r_a_konaseema_delete_policy"
  ON public.dcb_dr_b_r_a_konaseema
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_dr_b_r_a_konaseema IS 'DCB data for Dr. B.R. A.Konaseema district';


-- East Godavari

-- Create DCB table for East Godavari
CREATE TABLE IF NOT EXISTS public.dcb_east_godavari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_east_godavari_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_east_godavari_ap_gazette_no ON public.dcb_east_godavari(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_east_godavari_institution_name ON public.dcb_east_godavari(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_east_godavari_mandal ON public.dcb_east_godavari(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_east_godavari_village ON public.dcb_east_godavari(village);

-- Enable RLS
ALTER TABLE public.dcb_east_godavari ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_east_godavari_select_policy"
  ON public.dcb_east_godavari
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_east_godavari_insert_policy"
  ON public.dcb_east_godavari
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_east_godavari_update_policy"
  ON public.dcb_east_godavari
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_east_godavari_delete_policy"
  ON public.dcb_east_godavari
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_east_godavari IS 'DCB data for East Godavari district';


-- Kakinada

-- Create DCB table for Kakinada
CREATE TABLE IF NOT EXISTS public.dcb_kakinada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_kakinada_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_kakinada_ap_gazette_no ON public.dcb_kakinada(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_kakinada_institution_name ON public.dcb_kakinada(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_kakinada_mandal ON public.dcb_kakinada(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_kakinada_village ON public.dcb_kakinada(village);

-- Enable RLS
ALTER TABLE public.dcb_kakinada ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_kakinada_select_policy"
  ON public.dcb_kakinada
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_kakinada_insert_policy"
  ON public.dcb_kakinada
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_kakinada_update_policy"
  ON public.dcb_kakinada
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_kakinada_delete_policy"
  ON public.dcb_kakinada
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_kakinada IS 'DCB data for Kakinada district';


-- Parvathipuram

-- Create DCB table for Parvathipuram
CREATE TABLE IF NOT EXISTS public.dcb_parvathipuram (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_parvathipuram_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_parvathipuram_ap_gazette_no ON public.dcb_parvathipuram(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_parvathipuram_institution_name ON public.dcb_parvathipuram(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_parvathipuram_mandal ON public.dcb_parvathipuram(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_parvathipuram_village ON public.dcb_parvathipuram(village);

-- Enable RLS
ALTER TABLE public.dcb_parvathipuram ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_parvathipuram_select_policy"
  ON public.dcb_parvathipuram
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_parvathipuram_insert_policy"
  ON public.dcb_parvathipuram
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_parvathipuram_update_policy"
  ON public.dcb_parvathipuram
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_parvathipuram_delete_policy"
  ON public.dcb_parvathipuram
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_parvathipuram IS 'DCB data for Parvathipuram district';


-- Srikakulam

-- Create DCB table for Srikakulam
CREATE TABLE IF NOT EXISTS public.dcb_srikakulam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_srikakulam_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_srikakulam_ap_gazette_no ON public.dcb_srikakulam(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_srikakulam_institution_name ON public.dcb_srikakulam(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_srikakulam_mandal ON public.dcb_srikakulam(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_srikakulam_village ON public.dcb_srikakulam(village);

-- Enable RLS
ALTER TABLE public.dcb_srikakulam ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_srikakulam_select_policy"
  ON public.dcb_srikakulam
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_srikakulam_insert_policy"
  ON public.dcb_srikakulam
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_srikakulam_update_policy"
  ON public.dcb_srikakulam
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_srikakulam_delete_policy"
  ON public.dcb_srikakulam
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_srikakulam IS 'DCB data for Srikakulam district';


-- Tirupati

-- Create DCB table for Tirupati
CREATE TABLE IF NOT EXISTS public.dcb_tirupati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_tirupati_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_tirupati_ap_gazette_no ON public.dcb_tirupati(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_tirupati_institution_name ON public.dcb_tirupati(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_tirupati_mandal ON public.dcb_tirupati(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_tirupati_village ON public.dcb_tirupati(village);

-- Enable RLS
ALTER TABLE public.dcb_tirupati ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_tirupati_select_policy"
  ON public.dcb_tirupati
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_tirupati_insert_policy"
  ON public.dcb_tirupati
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_tirupati_update_policy"
  ON public.dcb_tirupati
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_tirupati_delete_policy"
  ON public.dcb_tirupati
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_tirupati IS 'DCB data for Tirupati district';


-- Visakhapatnam

-- Create DCB table for Visakhapatnam
CREATE TABLE IF NOT EXISTS public.dcb_visakhapatnam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_visakhapatnam_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_visakhapatnam_ap_gazette_no ON public.dcb_visakhapatnam(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_visakhapatnam_institution_name ON public.dcb_visakhapatnam(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_visakhapatnam_mandal ON public.dcb_visakhapatnam(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_visakhapatnam_village ON public.dcb_visakhapatnam(village);

-- Enable RLS
ALTER TABLE public.dcb_visakhapatnam ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_visakhapatnam_select_policy"
  ON public.dcb_visakhapatnam
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_visakhapatnam_insert_policy"
  ON public.dcb_visakhapatnam
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_visakhapatnam_update_policy"
  ON public.dcb_visakhapatnam
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_visakhapatnam_delete_policy"
  ON public.dcb_visakhapatnam
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_visakhapatnam IS 'DCB data for Visakhapatnam district';


-- Nellore

-- Create DCB table for Nellore
CREATE TABLE IF NOT EXISTS public.dcb_nellore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_nellore_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_nellore_ap_gazette_no ON public.dcb_nellore(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_nellore_institution_name ON public.dcb_nellore(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_nellore_mandal ON public.dcb_nellore(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_nellore_village ON public.dcb_nellore(village);

-- Enable RLS
ALTER TABLE public.dcb_nellore ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_nellore_select_policy"
  ON public.dcb_nellore
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_nellore_insert_policy"
  ON public.dcb_nellore
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_nellore_update_policy"
  ON public.dcb_nellore
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_nellore_delete_policy"
  ON public.dcb_nellore
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_nellore IS 'DCB data for Nellore district';


-- Palnadu

-- Create DCB table for Palnadu
CREATE TABLE IF NOT EXISTS public.dcb_palnadu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_palnadu_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_palnadu_ap_gazette_no ON public.dcb_palnadu(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_palnadu_institution_name ON public.dcb_palnadu(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_palnadu_mandal ON public.dcb_palnadu(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_palnadu_village ON public.dcb_palnadu(village);

-- Enable RLS
ALTER TABLE public.dcb_palnadu ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_palnadu_select_policy"
  ON public.dcb_palnadu
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_palnadu_insert_policy"
  ON public.dcb_palnadu
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_palnadu_update_policy"
  ON public.dcb_palnadu
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_palnadu_delete_policy"
  ON public.dcb_palnadu
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_palnadu IS 'DCB data for Palnadu district';


-- Guntur

-- Create DCB table for Guntur
CREATE TABLE IF NOT EXISTS public.dcb_guntur (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_guntur_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_guntur_ap_gazette_no ON public.dcb_guntur(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_guntur_institution_name ON public.dcb_guntur(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_guntur_mandal ON public.dcb_guntur(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_guntur_village ON public.dcb_guntur(village);

-- Enable RLS
ALTER TABLE public.dcb_guntur ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_guntur_select_policy"
  ON public.dcb_guntur
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_guntur_insert_policy"
  ON public.dcb_guntur
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_guntur_update_policy"
  ON public.dcb_guntur
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_guntur_delete_policy"
  ON public.dcb_guntur
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_guntur IS 'DCB data for Guntur district';


-- Krishna

-- Create DCB table for Krishna
CREATE TABLE IF NOT EXISTS public.dcb_krishna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_krishna_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_krishna_ap_gazette_no ON public.dcb_krishna(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_krishna_institution_name ON public.dcb_krishna(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_krishna_mandal ON public.dcb_krishna(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_krishna_village ON public.dcb_krishna(village);

-- Enable RLS
ALTER TABLE public.dcb_krishna ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_krishna_select_policy"
  ON public.dcb_krishna
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_krishna_insert_policy"
  ON public.dcb_krishna
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_krishna_update_policy"
  ON public.dcb_krishna
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_krishna_delete_policy"
  ON public.dcb_krishna
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_krishna IS 'DCB data for Krishna district';


-- Kurnool

-- Create DCB table for Kurnool
CREATE TABLE IF NOT EXISTS public.dcb_kurnool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_kurnool_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_kurnool_ap_gazette_no ON public.dcb_kurnool(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_kurnool_institution_name ON public.dcb_kurnool(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_kurnool_mandal ON public.dcb_kurnool(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_kurnool_village ON public.dcb_kurnool(village);

-- Enable RLS
ALTER TABLE public.dcb_kurnool ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_kurnool_select_policy"
  ON public.dcb_kurnool
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_kurnool_insert_policy"
  ON public.dcb_kurnool
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_kurnool_update_policy"
  ON public.dcb_kurnool
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_kurnool_delete_policy"
  ON public.dcb_kurnool
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_kurnool IS 'DCB data for Kurnool district';


-- Nandyal

-- Create DCB table for Nandyal
CREATE TABLE IF NOT EXISTS public.dcb_nandyal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_nandyal_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_nandyal_ap_gazette_no ON public.dcb_nandyal(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_nandyal_institution_name ON public.dcb_nandyal(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_nandyal_mandal ON public.dcb_nandyal(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_nandyal_village ON public.dcb_nandyal(village);

-- Enable RLS
ALTER TABLE public.dcb_nandyal ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_nandyal_select_policy"
  ON public.dcb_nandyal
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_nandyal_insert_policy"
  ON public.dcb_nandyal
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_nandyal_update_policy"
  ON public.dcb_nandyal
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_nandyal_delete_policy"
  ON public.dcb_nandyal
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_nandyal IS 'DCB data for Nandyal district';


-- NTR

-- Create DCB table for NTR
CREATE TABLE IF NOT EXISTS public.dcb_ntr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_ntr_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_ntr_ap_gazette_no ON public.dcb_ntr(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_ntr_institution_name ON public.dcb_ntr(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_ntr_mandal ON public.dcb_ntr(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_ntr_village ON public.dcb_ntr(village);

-- Enable RLS
ALTER TABLE public.dcb_ntr ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_ntr_select_policy"
  ON public.dcb_ntr
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_ntr_insert_policy"
  ON public.dcb_ntr
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_ntr_update_policy"
  ON public.dcb_ntr
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_ntr_delete_policy"
  ON public.dcb_ntr
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_ntr IS 'DCB data for NTR district';


-- Prakasam

-- Create DCB table for Prakasam
CREATE TABLE IF NOT EXISTS public.dcb_prakasam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_prakasam_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_prakasam_ap_gazette_no ON public.dcb_prakasam(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_prakasam_institution_name ON public.dcb_prakasam(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_prakasam_mandal ON public.dcb_prakasam(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_prakasam_village ON public.dcb_prakasam(village);

-- Enable RLS
ALTER TABLE public.dcb_prakasam ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_prakasam_select_policy"
  ON public.dcb_prakasam
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_prakasam_insert_policy"
  ON public.dcb_prakasam
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_prakasam_update_policy"
  ON public.dcb_prakasam
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_prakasam_delete_policy"
  ON public.dcb_prakasam
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_prakasam IS 'DCB data for Prakasam district';


-- Sri Sathya Sai

-- Create DCB table for Sri Sathya Sai
CREATE TABLE IF NOT EXISTS public.dcb_sri_sathya_sai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_sri_sathya_sai_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_sri_sathya_sai_ap_gazette_no ON public.dcb_sri_sathya_sai(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_sri_sathya_sai_institution_name ON public.dcb_sri_sathya_sai(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_sri_sathya_sai_mandal ON public.dcb_sri_sathya_sai(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_sri_sathya_sai_village ON public.dcb_sri_sathya_sai(village);

-- Enable RLS
ALTER TABLE public.dcb_sri_sathya_sai ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_sri_sathya_sai_select_policy"
  ON public.dcb_sri_sathya_sai
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_sri_sathya_sai_insert_policy"
  ON public.dcb_sri_sathya_sai
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_sri_sathya_sai_update_policy"
  ON public.dcb_sri_sathya_sai
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_sri_sathya_sai_delete_policy"
  ON public.dcb_sri_sathya_sai
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_sri_sathya_sai IS 'DCB data for Sri Sathya Sai district';


-- West Godavari

-- Create DCB table for West Godavari
CREATE TABLE IF NOT EXISTS public.dcb_west_godavari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_west_godavari_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_west_godavari_ap_gazette_no ON public.dcb_west_godavari(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_west_godavari_institution_name ON public.dcb_west_godavari(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_west_godavari_mandal ON public.dcb_west_godavari(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_west_godavari_village ON public.dcb_west_godavari(village);

-- Enable RLS
ALTER TABLE public.dcb_west_godavari ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_west_godavari_select_policy"
  ON public.dcb_west_godavari
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_west_godavari_insert_policy"
  ON public.dcb_west_godavari
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_west_godavari_update_policy"
  ON public.dcb_west_godavari
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_west_godavari_delete_policy"
  ON public.dcb_west_godavari
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_west_godavari IS 'DCB data for West Godavari district';


-- YSR Kadapa District

-- Create DCB table for YSR Kadapa District
CREATE TABLE IF NOT EXISTS public.dcb_ysr_kadapa_district (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Institution Information
  ap_gazette_no text NOT NULL,
  institution_name text NOT NULL,
  mandal text,
  village text,

  -- Extent (land area)
  extent_dry numeric(12,2) NOT NULL DEFAULT 0,
  extent_wet numeric(12,2) NOT NULL DEFAULT 0,
  extent_total numeric(12,2) GENERATED ALWAYS AS (extent_dry + extent_wet) STORED,

  -- Demand
  demand_arrears numeric(12,2) NOT NULL DEFAULT 0,
  demand_current numeric(12,2) NOT NULL DEFAULT 0,
  demand_total numeric(12,2) GENERATED ALWAYS AS (demand_arrears + demand_current) STORED,

  -- Collection
  collection_arrears numeric(12,2) NOT NULL DEFAULT 0,
  collection_current numeric(12,2) NOT NULL DEFAULT 0,
  collection_total numeric(12,2) GENERATED ALWAYS AS (collection_arrears + collection_current) STORED,

  -- Balance (auto-calculated)
  balance_arrears numeric(12,2) GENERATED ALWAYS AS (demand_arrears - collection_arrears) STORED,
  balance_current numeric(12,2) GENERATED ALWAYS AS (demand_current - collection_current) STORED,
  balance_total numeric(12,2) GENERATED ALWAYS AS (
    (demand_arrears + demand_current) - (collection_arrears + collection_current)
  ) STORED,

  -- Remarks
  remarks text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint on AP Gazette No
  CONSTRAINT dcb_ysr_kadapa_district_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dcb_ysr_kadapa_district_ap_gazette_no ON public.dcb_ysr_kadapa_district(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_dcb_ysr_kadapa_district_institution_name ON public.dcb_ysr_kadapa_district(institution_name);
CREATE INDEX IF NOT EXISTS idx_dcb_ysr_kadapa_district_mandal ON public.dcb_ysr_kadapa_district(mandal);
CREATE INDEX IF NOT EXISTS idx_dcb_ysr_kadapa_district_village ON public.dcb_ysr_kadapa_district(village);

-- Enable RLS
ALTER TABLE public.dcb_ysr_kadapa_district ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "dcb_ysr_kadapa_district_select_policy"
  ON public.dcb_ysr_kadapa_district
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "dcb_ysr_kadapa_district_insert_policy"
  ON public.dcb_ysr_kadapa_district
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "dcb_ysr_kadapa_district_update_policy"
  ON public.dcb_ysr_kadapa_district
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "dcb_ysr_kadapa_district_delete_policy"
  ON public.dcb_ysr_kadapa_district
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.dcb_ysr_kadapa_district IS 'DCB data for YSR Kadapa District district';


