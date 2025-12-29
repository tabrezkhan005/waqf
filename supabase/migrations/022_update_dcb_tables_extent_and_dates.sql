-- ============================================
-- Update District DCB Tables: Make Extent Columns Text and Add Date Columns
-- Change extent_dry and extent_wet to text to allow alphanumeric values
-- Add receiptno_date and challanno_date columns
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
        -- Drop extent_dry and extent_wet columns if they exist (as numeric)
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS extent_dry CASCADE', table_name);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS extent_wet CASCADE', table_name);

        -- Add new extent_dry and extent_wet as text (nullable)
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS extent_dry text', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS extent_wet text', table_name);

        -- Add receiptno_date and challanno_date columns if they don't exist
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS receiptno_date text', table_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS challanno_date text', table_name);

        RAISE NOTICE 'Updated table: %', table_name;
    END LOOP;
END $$;
