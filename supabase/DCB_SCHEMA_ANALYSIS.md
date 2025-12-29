# DCB Database Schema Analysis & Migration Plan

## 📋 Executive Summary

This document provides a complete analysis of the current database state and migration plan for the canonical `institution_dcb` table that will store DCB (Demand, Collection, Balance) data from Excel sheets.

---

## 1️⃣ Database Inspection Results

### Current Tables in Public Schema

Based on migration files, the following tables exist:

1. **`districts`** - Master list of 26 districts
2. **`profiles`** - User profiles (admin, inspector, accounts, reports)
3. **`institutions`** - Institution master data
4. **`collections`** - Collection records (separate workflow table)
5. **`receipts`** - Receipt image metadata
6. **`audit_log`** - Audit trail
7. **`institution_dcb`** - ⭐ **Main DCB table** (created in migration 010, updated in 012)

### Institution DCB Table Status

**Table Name:** `public.institution_dcb`

**Current State:**
- ✅ Table exists (created in `010_create_institution_dcb_table.sql`)
- ✅ Schema updated (in `012_update_institution_dcb_schema.sql`)
- ✅ RLS enabled
- ✅ Has generated columns for totals

**Potential Issues Found:**
1. Migration 012 tries to set `ap_no NOT NULL` which may fail if existing rows have NULL values
2. Column naming may not match exactly (need to verify)
3. Need to ensure all Excel columns are mapped

---

## 2️⃣ Canonical DCB Table Design

### Required Columns (from Excel)

| Excel Column | DB Column | Type | Notes |
|------------|-----------|------|-------|
| AP No | `ap_no` | `text` | UNIQUE NOT NULL (per financial_year) |
| Name of Institution | `institution_name` | `text` | |
| District | `district_name` | `text` | String for now, can link to districts table later |
| Name of Inspector | `inspector_name` | `text` | String for now, can map to profiles later |
| Ext-Dry | `ext_dry` | `numeric(12,2)` | Area of dry land |
| Ext-Wet | `ext_wet` | `numeric(12,2)` | Area of wet land |
| **Ext-Total** | `ext_total` | `numeric(12,2)` | **GENERATED**: ext_dry + ext_wet |
| D-Arrears | `d_arrears` | `numeric(12,2)` | Demand - Arrears |
| D-Current | `d_current` | `numeric(12,2)` | Demand - Current |
| **D-Total** | `d_total` | `numeric(12,2)` | **GENERATED**: d_arrears + d_current |
| Receipt No | `receipt_no` | `text` | |
| Receipt Date | `receipt_date` | `date` | |
| C-Arrears | `c_arrears` | `numeric(12,2)` | Collection - Arrears (filled by inspector) |
| C-Current | `c_current` | `numeric(12,2)` | Collection - Current (filled by inspector) |
| **C-Total** | `c_total` | `numeric(12,2)` | **GENERATED**: c_arrears + c_current |
| **B-Arrears** | `b_arrears` | `numeric(12,2)` | **GENERATED**: d_arrears - c_arrears |
| **B-Current** | `b_current` | `numeric(12,2)` | **GENERATED**: d_current - c_current |
| **B-Total** | `b_total` | `numeric(12,2)` | **GENERATED**: b_arrears + b_current |
| Upload Receipt | `receipt_file_path` | `text` | Path in Supabase Storage |
| Upload Bank Receipt | `bank_receipt_file_path` | `text` | Path in Supabase Storage |
| Remarks | `remarks` | `text` | |
| Financial Year | `financial_year` | `text` | e.g., "2024-25" or "2025-26" |
| Created At | `created_at` | `timestamptz` | Auto-set |
| Updated At | `updated_at` | `timestamptz` | Auto-updated via trigger |

### Constraints

- **Primary Key:** `id` (bigserial)
- **Unique Constraint:** `(ap_no, financial_year)` - One row per institution per financial year
- **Foreign Key:** `institution_id` → `institutions(id)` (optional, for linking to master data)
- **RLS:** Enabled (policies already exist)

### Generated Columns

All computed columns use `GENERATED ALWAYS AS ... STORED`:
- `ext_total = ext_dry + ext_wet`
- `d_total = d_arrears + d_current`
- `c_total = c_arrears + c_current`
- `b_arrears = d_arrears - c_arrears`
- `b_current = d_current - c_current`
- `b_total = b_arrears + b_current`

---

## 3️⃣ Migration Plan

### Step 1: Inspect Current Database

**File:** `inspect_database.sql`

Run this in Supabase SQL Editor to:
- List all tables
- Check `institution_dcb` structure
- Verify constraints and RLS
- Count existing rows

### Step 2: Apply Final Schema Migration

**File:** `013_finalize_institution_dcb_canonical.sql`

This migration:
- ✅ Adds all missing columns
- ✅ Renames columns to match Excel (d_arrear → d_arrears)
- ✅ Drops and recreates generated columns with correct expressions
- ✅ Sets up constraints (unique on ap_no + financial_year)
- ✅ Ensures RLS is enabled
- ✅ Creates performance indexes

**Safe to run:** Yes (uses `IF NOT EXISTS` and `IF EXISTS` checks)

### Step 3: Verify Excel Mapping

**File:** `verify_excel_mapping.sql`

Run this to verify all Excel columns have matching DB columns.

### Step 4: (Optional) Truncate Existing Data

**File:** `truncate_dcb_data.sql`

⚠️ **DESTRUCTIVE** - Only run if you want to start fresh.

This will:
- Delete all rows from `institution_dcb`
- Reset the auto-increment sequence

**Before running:**
1. Review the file
2. Uncomment the TRUNCATE line
3. Confirm you want to delete all data

---

## 4️⃣ Excel Import Strategy

### Recommended Approach: CSV Import via Supabase Dashboard

1. **Convert Excel to CSV:**
   - Open Excel file
   - Save As → CSV (UTF-8)
   - Ensure column headers match DB column names

2. **Map Excel Columns to DB Columns:**
   ```
   Excel Column          → DB Column
   AP No                 → ap_no
   Name of Institution   → institution_name
   District              → district_name
   Name of Inspector     → inspector_name
   Ext-Dry               → ext_dry
   Ext-Wet               → ext_wet
   D-Arrears             → d_arrears
   D-Current             → d_current
   Receipt No            → receipt_no
   Receipt Date          → receipt_date
   C-Arrears             → c_arrears
   C-Current             → c_current
   Upload Receipt        → receipt_file_path (leave empty, upload later)
   Upload Bank Receipt   → bank_receipt_file_path (leave empty, upload later)
   Remarks               → remarks
   ```

3. **Import Options:**
   - **Option A:** Supabase Dashboard → Table Editor → Import CSV
   - **Option B:** SQL COPY command (for large datasets)
   - **Option C:** Script using Supabase client (for programmatic import)

### SQL COPY Example (for large datasets)

```sql
-- First, create a temporary table matching CSV structure
CREATE TEMP TABLE temp_dcb_import (
  ap_no text,
  institution_name text,
  district_name text,
  inspector_name text,
  ext_dry numeric(12,2),
  ext_wet numeric(12,2),
  d_arrears numeric(12,2),
  d_current numeric(12,2),
  receipt_no text,
  receipt_date date,
  c_arrears numeric(12,2),
  c_current numeric(12,2),
  remarks text,
  financial_year text DEFAULT '2024-25'
);

-- Copy from CSV (adjust path)
COPY temp_dcb_import FROM '/path/to/your/file.csv'
  WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insert into institution_dcb
INSERT INTO public.institution_dcb (
  ap_no, institution_name, district_name, inspector_name,
  ext_dry, ext_wet,
  d_arrears, d_current,
  receipt_no, receipt_date,
  c_arrears, c_current,
  remarks, financial_year
)
SELECT * FROM temp_dcb_import
ON CONFLICT (ap_no, financial_year) DO UPDATE SET
  institution_name = EXCLUDED.institution_name,
  district_name = EXCLUDED.district_name,
  inspector_name = EXCLUDED.inspector_name,
  ext_dry = EXCLUDED.ext_dry,
  ext_wet = EXCLUDED.ext_wet,
  d_arrears = EXCLUDED.d_arrears,
  d_current = EXCLUDED.d_current,
  receipt_no = EXCLUDED.receipt_no,
  receipt_date = EXCLUDED.receipt_date,
  c_arrears = EXCLUDED.c_arrears,
  c_current = EXCLUDED.c_current,
  remarks = EXCLUDED.remarks,
  updated_at = now();
```

---

## 5️⃣ Action Items

### ✅ Immediate Actions

1. **Run Inspection:**
   ```sql
   -- Execute inspect_database.sql in Supabase SQL Editor
   ```

2. **Apply Migration:**
   ```sql
   -- Execute 013_finalize_institution_dcb_canonical.sql
   ```

3. **Verify Schema:**
   ```sql
   -- Execute verify_excel_mapping.sql
   ```

### ⚠️ Optional (Destructive)

4. **Truncate Data (if starting fresh):**
   ```sql
   -- Review truncate_dcb_data.sql
   -- Uncomment TRUNCATE line if confirmed
   -- Execute in Supabase SQL Editor
   ```

### 📥 Next Steps

5. **Prepare Excel Data:**
   - Convert to CSV
   - Map columns
   - Clean data (remove empty rows, fix date formats)

6. **Import Data:**
   - Use Supabase Dashboard or SQL COPY
   - Verify row counts match

7. **Test Application:**
   - Verify inspectors can view/update collections
   - Test file uploads for receipts
   - Verify generated columns calculate correctly

---

## 6️⃣ Notes & Considerations

### Data Integrity

- **ap_no** must be unique per financial_year
- Generated columns are automatically calculated
- File paths should be relative to Supabase Storage bucket

### Performance

- Indexes created on: `ap_no`, `financial_year`, `district_name`, `inspector_name`
- Consider adding composite index on `(district_name, financial_year)` if filtering by both

### Future Enhancements

- Link `district_name` to `districts` table (add `district_id` foreign key)
- Link `inspector_name` to `profiles` table (add `inspector_id` foreign key)
- Link `institution_name` to `institutions` table (already has `institution_id`)

### RLS Policies

Existing policies allow:
- **Inspectors:** View/update DCB for their district
- **Admin/Accounts/Reports:** View all DCB
- **Admin:** Full CRUD on DCB

These should work with the new schema, but verify after migration.

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify RLS policies are working
3. Test with a small sample dataset first
4. Review generated column expressions if totals are incorrect
























