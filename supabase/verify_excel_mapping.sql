-- ============================================
-- Verification: Excel Column to Database Mapping
-- ============================================
-- This query verifies that all Excel columns have matching DB columns
-- ============================================

SELECT
  'Excel Column' AS source,
  'DB Column' AS target,
  'Status' AS status
UNION ALL

-- Identity columns
SELECT 'AP No', 'ap_no',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'ap_no'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Name of Institution', 'institution_name',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'institution_name'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'District', 'district_name',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'district_name'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Name of Inspector', 'inspector_name',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'inspector_name'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END

-- Land area columns
UNION ALL
SELECT 'Ext-Dry', 'ext_dry',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'ext_dry'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Ext-Wet', 'ext_wet',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'ext_wet'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Ext-Total', 'ext_total',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'ext_total'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END

-- Demand columns
UNION ALL
SELECT 'D-Arrears', 'd_arrears',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'd_arrears'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'D-Current', 'd_current',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'd_current'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'D-Total', 'd_total',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'd_total'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END

-- Receipt info
UNION ALL
SELECT 'Receipt No', 'receipt_no',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'receipt_no'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Receipt Date', 'receipt_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'receipt_date'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END

-- Collection columns
UNION ALL
SELECT 'C-Arrears', 'c_arrears',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'c_arrears'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'C-Current', 'c_current',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'c_current'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'C-Total', 'c_total',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'c_total'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END

-- Balance columns (computed)
UNION ALL
SELECT 'B-Arrears', 'b_arrears',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'b_arrears'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END
UNION ALL
SELECT 'B-Current', 'b_current',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'b_current'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END
UNION ALL
SELECT 'B-Total', 'b_total',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'b_total'
  ) THEN '✓ EXISTS (GENERATED)' ELSE '✗ MISSING' END

-- File paths
UNION ALL
SELECT 'Upload Receipt', 'receipt_file_path',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'receipt_file_path'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Upload Bank Receipt', 'bank_receipt_file_path',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'bank_receipt_file_path'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'Remarks', 'remarks',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'remarks'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END

-- Metadata
UNION ALL
SELECT 'Financial Year', 'financial_year',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_dcb' AND column_name = 'financial_year'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END;

-- ============================================
-- Detailed column information
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated,
  CASE
    WHEN is_generated = 'ALWAYS' THEN 'GENERATED'
    ELSE 'STORED'
  END AS column_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'institution_dcb'
ORDER BY
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'ap_no' THEN 2
    WHEN 'institution_name' THEN 3
    WHEN 'district_name' THEN 4
    WHEN 'inspector_name' THEN 5
    WHEN 'ext_dry' THEN 6
    WHEN 'ext_wet' THEN 7
    WHEN 'ext_total' THEN 8
    WHEN 'd_arrears' THEN 9
    WHEN 'd_current' THEN 10
    WHEN 'd_total' THEN 11
    WHEN 'receipt_no' THEN 12
    WHEN 'receipt_date' THEN 13
    WHEN 'c_arrears' THEN 14
    WHEN 'c_current' THEN 15
    WHEN 'c_total' THEN 16
    WHEN 'b_arrears' THEN 17
    WHEN 'b_current' THEN 18
    WHEN 'b_total' THEN 19
    WHEN 'receipt_file_path' THEN 20
    WHEN 'bank_receipt_file_path' THEN 21
    WHEN 'remarks' THEN 22
    WHEN 'financial_year' THEN 23
    WHEN 'created_at' THEN 24
    WHEN 'updated_at' THEN 25
    ELSE 99
  END;
























