# DCB CSV Import Guide

## Problem
When uploading CSV files directly to Supabase, empty cells are treated as empty strings (`""`), which causes errors for numeric columns:
```
ERROR: 22P02: invalid input syntax for type numeric: ""
```

## Solution 1: Clean CSV Before Upload (Recommended)

Use the Python script to clean your CSV file before uploading:

```bash
python scripts/clean_csv_for_dcb_import.py your_file.csv --district dcb_chittoor
```

This will:
- Convert empty strings to proper NULL values
- Clean numeric columns
- Handle alphanumeric values in `extent_total`
- Create a cleaned CSV file ready for upload

**Example:**
```bash
python scripts/clean_csv_for_dcb_import.py data/chittoor_dcb.csv -o data/chittoor_dcb_cleaned.csv -d dcb_chittoor
```

Then upload `chittoor_dcb_cleaned.csv` to Supabase Dashboard.

## Solution 2: Use Staging Table (For Large Files)

1. **Upload CSV to staging table:**
   - Go to Supabase Dashboard → Table Editor
   - Select table: `dcb_staging_import`
   - Import your CSV (all columns are text, so no type errors)

2. **Import to your district table:**
   ```sql
   SELECT * FROM import_from_staging_to_dcb('dcb_chittoor');
   ```

   Replace `dcb_chittoor` with your district table name.

## Solution 3: Manual CSV Preparation

Before uploading, ensure your CSV:
- Has empty cells (not empty strings) for NULL values
- Numeric columns contain only numbers or are completely empty
- `extent_total` can contain alphanumeric values (e.g., "10.5", "ABC123", "N/A")

**In Excel:**
1. Select all empty cells in numeric columns
2. Press Delete (not Backspace) to make them truly empty
3. Save as CSV (UTF-8)

## Column Mapping

Your CSV columns should map to database columns:

| CSV Column | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `ap_gazett` | `ap_gazette_no` | text | Required |
| `institutior` | `institution_name` | text | Required |
| `village` | `village` | text | Optional |
| `mandal` | `mandal` | text | Optional |
| `extent_dr` | `extent_dry` | numeric | Optional |
| `extent_w` | `extent_wet` | numeric | Optional |
| `extent_to` | `extent_total` | text | Optional, can be alphanumeric |
| `demand_arrears` | `demand_arrears` | numeric | Optional |
| `demand_current` | `demand_current` | numeric | Optional |
| `demand_total` | `demand_total` | numeric | Optional, editable |
| `collection_arrears` | `collection_arrears` | numeric | Optional |
| `collection_current` | `collection_current` | numeric | Optional |
| `collection_total` | `collection_total` | numeric | Optional, editable |
| `balance_arrears` | `balance_arrears` | numeric | Optional, editable |
| `balance_current` | `balance_current` | numeric | Optional, editable |
| `balance_total` | `balance_total` | numeric | Optional, editable |
| `remarks` | `remarks` | text | Optional |

## Quick Fix for Current Error

If you're getting the error right now:

1. **Download your CSV file**
2. **Run the cleaning script:**
   ```bash
   python scripts/clean_csv_for_dcb_import.py your_file.csv
   ```
3. **Upload the cleaned file** (`your_file_cleaned.csv`)

The script automatically:
- Converts empty strings to NULL
- Handles alphanumeric values in `extent_total`
- Cleans all numeric columns
- Preserves your data structure
