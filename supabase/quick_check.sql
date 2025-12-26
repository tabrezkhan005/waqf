-- Quick Database Check for 'waqf'
-- Run this to quickly see what tables exist and their status

-- List all public tables
SELECT
  tablename AS "Table Name",
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END AS "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show table row counts
DO $$
DECLARE
  r RECORD;
  count_val BIGINT;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', r.tablename) INTO count_val;
    RAISE NOTICE 'Table: % | Rows: %', r.tablename, count_val;
  END LOOP;
END $$;




