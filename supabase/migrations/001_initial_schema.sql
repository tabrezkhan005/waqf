-- ============================================
-- Government Financial Collection Management
-- Initial Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DISTRICTS TABLE
CREATE TABLE IF NOT EXISTS public.districts (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  code        text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'inspector', 'accounts', 'reports')),
  district_id int REFERENCES public.districts (id),
  device_id   text, -- for device binding
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspector_must_have_district CHECK (
    (role = 'inspector' AND district_id IS NOT NULL) OR
    (role != 'inspector')
  )
);

-- INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.institutions (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  code         text UNIQUE,
  district_id  int NOT NULL REFERENCES public.districts (id),
  address      text,
  contact_name text,
  contact_phone text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
  id              bigserial PRIMARY KEY,
  institution_id  bigint NOT NULL REFERENCES public.institutions (id),
  inspector_id    uuid NOT NULL REFERENCES public.profiles (id),
  arrear_amount   numeric(12,2) NOT NULL DEFAULT 0 CHECK (arrear_amount >= 0),
  current_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  total_amount    numeric(12,2) GENERATED ALWAYS AS (arrear_amount + current_amount) STORED,
  status          text NOT NULL CHECK (status IN ('pending', 'sent_to_accounts', 'verified', 'rejected')) DEFAULT 'pending',
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  challan_no      text,
  challan_date    date,
  verified_by     uuid REFERENCES public.profiles (id),
  verified_at     timestamptz,
  remarks         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RECEIPTS TABLE (image metadata)
CREATE TABLE IF NOT EXISTS public.receipts (
  id            bigserial PRIMARY KEY,
  collection_id bigint NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('bill', 'transaction')),
  file_path     text NOT NULL, -- path in Supabase Storage bucket
  file_name     text NOT NULL,
  file_size     bigint,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles (id),
  action      text NOT NULL,
  table_name  text,
  row_id      text,
  details     jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district_id ON public.profiles(district_id);
CREATE INDEX IF NOT EXISTS idx_institutions_district_id ON public.institutions(district_id);
CREATE INDEX IF NOT EXISTS idx_institutions_is_active ON public.institutions(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_inspector_id ON public.collections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_collections_institution_id ON public.collections(institution_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_collection_date ON public.collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_receipts_collection_id ON public.receipts(collection_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON public.districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.districts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log    ENABLE ROW LEVEL SECURITY;




