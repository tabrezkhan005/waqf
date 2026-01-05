-- Create queries table for inspector queries/support tickets
CREATE TABLE IF NOT EXISTS public.queries (
  id bigserial PRIMARY KEY,
  inspector_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN (
    'unable_to_upload_receipt',
    'wrong_amount_collected',
    'institution_not_found',
    'verification_dispute',
    'other'
  )),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for queries
-- Inspectors can only see their own queries
CREATE POLICY "Inspectors can view own queries"
  ON public.queries
  FOR SELECT
  USING (
    auth.uid() = inspector_id
  );

-- Inspectors can create their own queries
CREATE POLICY "Inspectors can create own queries"
  ON public.queries
  FOR INSERT
  WITH CHECK (
    auth.uid() = inspector_id
  );

-- Inspectors can update their own open queries
CREATE POLICY "Inspectors can update own open queries"
  ON public.queries
  FOR UPDATE
  USING (
    auth.uid() = inspector_id AND status = 'open'
  );

-- Admin, Accounts, and Reports can view all queries
CREATE POLICY "Admin can view all queries"
  ON public.queries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'accounts', 'reports')
    )
  );

-- Admin and Accounts can update queries (resolve them)
CREATE POLICY "Admin can update all queries"
  ON public.queries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'accounts')
    )
  );

-- Create index for faster queries
CREATE INDEX idx_queries_inspector_id ON public.queries(inspector_id);
CREATE INDEX idx_queries_status ON public.queries(status);
CREATE INDEX idx_queries_created_at ON public.queries(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON public.queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();







































