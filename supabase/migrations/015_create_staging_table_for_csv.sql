-- ============================================
-- Migration: Create staging table for CSV import
-- This table has exact CSV column names for easy import
-- ============================================

BEGIN;

-- Create staging table with exact CSV column names
CREATE TABLE IF NOT EXISTS institution_dcb_staging (
  "S.no" text,
  "AP Gazette No." text,
  "Name of Institution" text,
  "District" text,
  "Mandal" text,
  "Village" text,
  "Name of Inspector" text,
  "Ext-Dry" numeric(12,2),
  "Ext-Wet" numeric(12,2),
  "Ext-Tot" numeric(12,2),
  "D-Arrears" numeric(12,2),
  "D-Current" numeric(12,2),
  "D-Tot" numeric(12,2),
  "Receipt No and Date" text,
  "Challan No and Date" text,
  "C-Arrears" numeric(12,2),
  "C-Current" numeric(12,2),
  "C-Tot" numeric(12,2),
  "B-Arrears" numeric(12,2),
  "B-Current" numeric(12,2),
  "B-Tot" numeric(12,2),
  "Remarks" text,
  "Financial Year" text
);

-- Create improved import function
CREATE OR REPLACE FUNCTION import_from_staging()
RETURNS TABLE(imported_count int, errors_count int) AS $$
DECLARE
  rec RECORD;
  receipt_no text;
  receipt_date date;
  challan_no text;
  challan_date date;
  imported int := 0;
  errors int := 0;
  date_pattern text;
BEGIN
  FOR rec IN SELECT * FROM institution_dcb_staging LOOP
    BEGIN
      -- Parse receipt no and date
      receipt_no := NULL;
      receipt_date := NULL;
      IF rec."Receipt No and Date" IS NOT NULL AND rec."Receipt No and Date" != '' THEN
        -- Try different date patterns
        date_pattern := regexp_match(rec."Receipt No and Date", '\d{1,2}[-/]\d{1,2}[-/]\d{2,4}');
        IF date_pattern IS NOT NULL THEN
          BEGIN
            -- Try DD-MM-YYYY format first
            receipt_date := to_date(date_pattern[1], 'DD-MM-YYYY');
          EXCEPTION
            WHEN OTHERS THEN
              BEGIN
                receipt_date := to_date(date_pattern[1], 'DD/MM/YYYY');
              EXCEPTION
                WHEN OTHERS THEN
                  BEGIN
                    receipt_date := to_date(date_pattern[1], 'YYYY-MM-DD');
                  EXCEPTION
                    WHEN OTHERS THEN receipt_date := NULL;
                  END;
              END;
          END;
        END IF;

        -- Extract receipt number (everything before date)
        receipt_no := regexp_replace(rec."Receipt No and Date", '\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}.*$', '');
        receipt_no := trim(receipt_no);
        IF receipt_no = '' THEN receipt_no := NULL; END IF;
      END IF;

      -- Parse challan no and date (same logic)
      challan_no := NULL;
      challan_date := NULL;
      IF rec."Challan No and Date" IS NOT NULL AND rec."Challan No and Date" != '' THEN
        date_pattern := regexp_match(rec."Challan No and Date", '\d{1,2}[-/]\d{1,2}[-/]\d{2,4}');
        IF date_pattern IS NOT NULL THEN
          BEGIN
            challan_date := to_date(date_pattern[1], 'DD-MM-YYYY');
          EXCEPTION
            WHEN OTHERS THEN
              BEGIN
                challan_date := to_date(date_pattern[1], 'DD/MM/YYYY');
              EXCEPTION
                WHEN OTHERS THEN
                  BEGIN
                    challan_date := to_date(date_pattern[1], 'YYYY-MM-DD');
                  EXCEPTION
                    WHEN OTHERS THEN challan_date := NULL;
                  END;
              END;
          END;
        END IF;

        challan_no := regexp_replace(rec."Challan No and Date", '\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}.*$', '');
        challan_no := trim(challan_no);
        IF challan_no = '' THEN challan_no := NULL; END IF;
      END IF;

      -- Validate required field
      IF rec."AP Gazette No." IS NULL OR rec."AP Gazette No." = '' THEN
        errors := errors + 1;
        CONTINUE;
      END IF;

      -- Insert into main table
      INSERT INTO institution_dcb (
        ap_no,
        institution_name,
        district_name,
        mandal,
        village,
        inspector_name,
        ext_dry,
        ext_wet,
        d_arrears,
        d_current,
        receipt_no,
        receipt_date,
        challan_no,
        challan_date,
        c_arrears,
        c_current,
        remarks,
        financial_year
      ) VALUES (
        rec."AP Gazette No.",
        NULLIF(rec."Name of Institution", ''),
        NULLIF(rec."District", ''),
        NULLIF(rec."Mandal", ''),
        NULLIF(rec."Village", ''),
        NULLIF(rec."Name of Inspector", ''),
        rec."Ext-Dry",
        rec."Ext-Wet",
        COALESCE(rec."D-Arrears", 0),
        COALESCE(rec."D-Current", 0),
        receipt_no,
        receipt_date,
        challan_no,
        challan_date,
        COALESCE(rec."C-Arrears", 0),
        COALESCE(rec."C-Current", 0),
        NULLIF(rec."Remarks", ''),
        COALESCE(NULLIF(rec."Financial Year", ''), '2024-25')
      )
      ON CONFLICT (ap_no, financial_year) DO UPDATE SET
        institution_name = EXCLUDED.institution_name,
        district_name = EXCLUDED.district_name,
        mandal = EXCLUDED.mandal,
        village = EXCLUDED.village,
        inspector_name = EXCLUDED.inspector_name,
        ext_dry = EXCLUDED.ext_dry,
        ext_wet = EXCLUDED.ext_wet,
        d_arrears = EXCLUDED.d_arrears,
        d_current = EXCLUDED.d_current,
        receipt_no = EXCLUDED.receipt_no,
        receipt_date = EXCLUDED.receipt_date,
        challan_no = EXCLUDED.challan_no,
        challan_date = EXCLUDED.challan_date,
        c_arrears = EXCLUDED.c_arrears,
        c_current = EXCLUDED.c_current,
        remarks = EXCLUDED.remarks,
        updated_at = now();

      imported := imported + 1;
    EXCEPTION
      WHEN OTHERS THEN
        errors := errors + 1;
        RAISE NOTICE 'Error importing row with AP No %: %', rec."AP Gazette No.", SQLERRM;
    END;
  END LOOP;

  -- Clear staging table after import
  TRUNCATE TABLE institution_dcb_staging;

  RETURN QUERY SELECT imported, errors;
END;
$$ LANGUAGE plpgsql;

COMMIT;









