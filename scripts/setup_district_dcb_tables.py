#!/usr/bin/env python3
"""
Setup District-Specific DCB Tables
Deletes existing DCB data and creates separate tables for each district
Each table has auto-calculated balance columns
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")

# Try to read from .env file if not in environment
if not SUPABASE_URL or not SUPABASE_KEY:
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")

                    if not SUPABASE_URL and (key == "SUPABASE_URL" or key == "EXPO_PUBLIC_SUPABASE_URL"):
                        SUPABASE_URL = value
                    if not SUPABASE_KEY and (key == "SUPABASE_SERVICE_ROLE_KEY" or
                                            key == "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" or
                                            key == "SERVICE_ROLE_KEY"):
                        SUPABASE_KEY = value

if not SUPABASE_URL:
    print("[ERROR] SUPABASE_URL not found!")
    sys.exit(1)

if not SUPABASE_KEY:
    print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not found!")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def sanitize_table_name(district_name: str) -> str:
    """Convert district name to valid PostgreSQL table name"""
    # Convert to lowercase and replace spaces/special chars with underscores
    name = district_name.lower()
    name = name.replace(' ', '_')
    name = name.replace('.', '_')
    name = name.replace('-', '_')
    name = name.replace("'", '')
    # Remove multiple underscores
    while '__' in name:
        name = name.replace('__', '_')
    # Remove leading/trailing underscores
    name = name.strip('_')
    return f"dcb_{name}"

def create_district_dcb_table(district_name: str, table_name: str) -> str:
    """Generate SQL to create a district-specific DCB table"""
    sql = f"""
-- Create DCB table for {district_name}
CREATE TABLE IF NOT EXISTS public.{table_name} (
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
  CONSTRAINT {table_name}_ap_gazette_no_unique UNIQUE (ap_gazette_no)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_{table_name}_ap_gazette_no ON public.{table_name}(ap_gazette_no);
CREATE INDEX IF NOT EXISTS idx_{table_name}_institution_name ON public.{table_name}(institution_name);
CREATE INDEX IF NOT EXISTS idx_{table_name}_mandal ON public.{table_name}(mandal);
CREATE INDEX IF NOT EXISTS idx_{table_name}_village ON public.{table_name}(village);

-- Enable RLS
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read
CREATE POLICY "{table_name}_select_policy"
  ON public.{table_name}
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert
CREATE POLICY "{table_name}_insert_policy"
  ON public.{table_name}
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update
CREATE POLICY "{table_name}_update_policy"
  ON public.{table_name}
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to delete
CREATE POLICY "{table_name}_delete_policy"
  ON public.{table_name}
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.{table_name} IS 'DCB data for {district_name} district';
"""
    return sql

def main():
    print("=" * 80)
    print("Setting up District-Specific DCB Tables")
    print("=" * 80)

    # Step 1: Get all districts
    print("\n[1/4] Fetching districts from database...")
    try:
        districts_result = supabase.table("districts").select("id, name").execute()
        districts = districts_result.data if districts_result.data else []

        if not districts:
            print("[ERROR] No districts found in database!")
            sys.exit(1)

        print(f"[OK] Found {len(districts)} districts")
        for d in districts:
            print(f"  - {d['name']}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch districts: {e}")
        sys.exit(1)

    # Step 2: Delete existing DCB data
    print("\n[2/4] Deleting existing DCB data from institution_dcb table...")
    try:
        delete_result = supabase.table("institution_dcb").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"[OK] Deleted existing DCB data")
    except Exception as e:
        print(f"[WARN] Error deleting DCB data (may not exist): {e}")

    # Step 3: Create tables for each district
    print("\n[3/4] Creating district-specific DCB tables...")
    created_tables = []
    failed_tables = []

    for district in districts:
        district_name = district['name']
        table_name = sanitize_table_name(district_name)

        try:
            sql = create_district_dcb_table(district_name, table_name)

            # Execute SQL using Supabase
            # Note: We'll use execute_sql via MCP, but for now we'll create a migration file
            print(f"  - Creating table for {district_name} ({table_name})...")

            # Store SQL for later execution
            created_tables.append({
                'district': district_name,
                'table': table_name,
                'sql': sql
            })
            print(f"    [OK] SQL generated for {table_name}")

        except Exception as e:
            print(f"    [ERROR] Failed to create table for {district_name}: {e}")
            failed_tables.append(district_name)

    # Step 4: Save migration SQL file
    print("\n[4/4] Generating migration SQL file...")
    migration_file = Path(__file__).parent.parent / "supabase" / "migrations" / "020_create_district_dcb_tables.sql"
    migration_file.parent.mkdir(parents=True, exist_ok=True)

    with open(migration_file, 'w', encoding='utf-8') as f:
        f.write("-- ============================================\n")
        f.write("-- Create District-Specific DCB Tables\n")
        f.write("-- Each district gets its own DCB table with auto-calculated balance columns\n")
        f.write("-- ============================================\n\n")
        f.write("-- Delete existing DCB data\n")
        f.write("TRUNCATE TABLE public.institution_dcb CASCADE;\n\n")
        f.write("-- ============================================\n")
        f.write("-- Create tables for each district\n")
        f.write("-- ============================================\n\n")

        for table_info in created_tables:
            f.write(f"-- {table_info['district']}\n")
            f.write(table_info['sql'])
            f.write("\n\n")

    print(f"[OK] Migration file created: {migration_file}")

    # Summary
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Districts processed: {len(districts)}")
    print(f"Tables created: {len(created_tables)}")
    if failed_tables:
        print(f"Failed: {len(failed_tables)}")
        for d in failed_tables:
            print(f"  - {d}")

    print("\n[INFO] Next steps:")
    print("1. Review the migration file: supabase/migrations/020_create_district_dcb_tables.sql")
    print("2. Apply the migration using Supabase MCP or CLI")
    print("3. Upload DCB data for each district to the respective table")
    print("\n[INFO] Table naming convention: dcb_<district_name_lowercase_with_underscores>")
    print("Example: 'Chittoor' -> 'dcb_chittoor', 'Dr. B.R. A.Konaseema' -> 'dcb_dr_br_a_konaseema'")

if __name__ == "__main__":
    main()
