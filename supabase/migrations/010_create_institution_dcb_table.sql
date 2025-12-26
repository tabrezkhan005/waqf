-- Create institution_dcb table for Demand, Collection, Balance tracking
CREATE TABLE IF NOT EXISTS public.institution_dcb (
  id              bigserial PRIMARY KEY,
  institution_id  bigint NOT NULL REFERENCES public.institutions (id) ON DELETE CASCADE,
  financial_year  text NOT NULL DEFAULT '2024-25',
  d_arrear        numeric(12,2) NOT NULL DEFAULT 0,
  d_current       numeric(12,2) NOT NULL DEFAULT 0,
  d_total         numeric(12,2) GENERATED ALWAYS AS (d_arrear + d_current) STORED,
  c_arrear        numeric(12,2) NOT NULL DEFAULT 0,
  c_current       numeric(12,2) NOT NULL DEFAULT 0,
  b_arrear        numeric(12,2) GENERATED ALWAYS AS (d_arrear - c_arrear) STORED,
  b_current       numeric(12,2) GENERATED ALWAYS AS (d_current - c_current) STORED,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, financial_year)
);

-- Create index for faster lookups
CREATE INDEX idx_institution_dcb_institution_id ON public.institution_dcb(institution_id);
CREATE INDEX idx_institution_dcb_financial_year ON public.institution_dcb(financial_year);

-- Enable RLS
ALTER TABLE public.institution_dcb ENABLE ROW LEVEL SECURITY;

-- RLS Policies for institution_dcb
-- Inspectors can view DCB for institutions in their district
CREATE POLICY "Inspectors can view DCB for their district"
  ON public.institution_dcb
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.institutions i
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE i.id = institution_dcb.institution_id
        AND i.district_id = p.district_id
        AND p.role = 'inspector'
    )
  );

-- Inspectors can update collection values (c_arrear, c_current) for their district
CREATE POLICY "Inspectors can update collections for their district"
  ON public.institution_dcb
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.institutions i
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE i.id = institution_dcb.institution_id
        AND i.district_id = p.district_id
        AND p.role = 'inspector'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.institutions i
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE i.id = institution_dcb.institution_id
        AND i.district_id = p.district_id
        AND p.role = 'inspector'
    )
  );

-- Admin, Accounts, Reports can view all DCB
CREATE POLICY "Admin can view all DCB"
  ON public.institution_dcb
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'accounts', 'reports')
    )
  );

-- Admin can insert/update DCB (for setting demand values)
CREATE POLICY "Admin can manage DCB"
  ON public.institution_dcb
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_institution_dcb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_institution_dcb_timestamp
  BEFORE UPDATE ON public.institution_dcb
  FOR EACH ROW
  EXECUTE FUNCTION update_institution_dcb_updated_at();

























