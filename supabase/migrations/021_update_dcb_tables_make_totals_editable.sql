-- ============================================
-- Update District DCB Tables: Make Totals and Balances Editable
-- Change extent_total to text to allow alphanumeric values
-- ============================================

-- Function to update a single table
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'dcb_adoni', 'dcb_alluri_seetaramaraju', 'dcb_anakapalli', 'dcb_anantapuramu',
        'dcb_annamayya', 'dcb_bapatla', 'dcb_chittoor', 'dcb_dr_b_r_a_konaseema',
        'dcb_east_godavari', 'dcb_eluru', 'dcb_guntur', 'dcb_kakinada',
        'dcb_krishna', 'dcb_kurnool', 'dcb_nandyal', 'dcb_nellore',
        'dcb_ntr', 'dcb_palnadu', 'dcb_parvathipuram', 'dcb_prakasam',
        'dcb_sri_sathya_sai', 'dcb_srikakulam', 'dcb_tirupati', 'dcb_vijayanagaram',
        'dcb_vijayawada', 'dcb_visakhapatnam', 'dcb_west_godavari', 'dcb_ysr_kadapa_district'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Drop generated columns if they exist
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS extent_total CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS demand_total CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS collection_total CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS balance_arrears CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS balance_current CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS balance_total CASCADE', table_name);

        -- Add new editable columns
        -- extent_total as text to allow alphanumeric values
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS extent_total text', table_name);

        -- Other totals as nullable numeric
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS demand_total numeric(12,2)', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS collection_total numeric(12,2)', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS balance_arrears numeric(12,2)', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS balance_current numeric(12,2)', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS balance_total numeric(12,2)', table_name);

        RAISE NOTICE 'Updated table: %', table_name;
    END LOOP;
END $$;
